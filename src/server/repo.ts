import "server-only";
import { ObjectId, type Db, type WithId } from "mongodb";
import { assignCodes, generateMatches, type EntryInput } from "@/lib/generateMatches";
import { buildHallOfFame } from "@/lib/hallOfFame";
import { isSupported } from "@/lib/hanulRules";
import { compareMemberStats, computeMemberStats, type MemberStats, type TournamentRecord } from "@/lib/memberStats";
import { isPlayed, validateScore } from "@/lib/score";
import { groupStandings, type StandingTable } from "@/lib/standings";
import type { Awards, Group, Match, MatchMethod, Member, NoticeItem, Side, Tournament } from "@/lib/types";
import { getDb } from "./db";
import { badRequest, conflict, HttpError, notFound } from "./errors";

// ───────────────────────── DB 문서 타입 ─────────────────────────

interface MemberDoc {
  name: string;
  nickname: string; // 없으면 "" (고유 인덱스 {name, nickname} 일관성 유지)
  isActive: boolean;
  createdAt: Date;
}

interface TournamentDoc {
  title: string;
  year: number;
  month: number;
  date: string;
  status: Tournament["status"];
  createdAt: Date;
  completedAt?: Date;
}

interface GroupDoc {
  tournamentId: ObjectId;
  name: string;
  order: number;
  method: MatchMethod;
  size: number;
  participants: { code: string; side?: Side; memberId: ObjectId | null; displayName: string }[];
  matches: (Match & { updatedAt?: Date })[];
  awards?: Awards;
  createdAt: Date;
}

const members = (db: Db) => db.collection<MemberDoc>("members");
const tournaments = (db: Db) => db.collection<TournamentDoc>("tournaments");
const groups = (db: Db) => db.collection<GroupDoc>("groups");

// ───────────────────────── 매핑 ─────────────────────────

function oid(id: string, what = "대상"): ObjectId {
  if (!ObjectId.isValid(id)) throw notFound(what);
  return new ObjectId(id);
}

const toMember = (d: WithId<MemberDoc>): Member => ({
  id: d._id.toHexString(),
  name: d.name,
  nickname: d.nickname || undefined,
  isActive: d.isActive,
});

const toTournament = (d: WithId<TournamentDoc>): Tournament => ({
  id: d._id.toHexString(),
  title: d.title,
  year: d.year,
  month: d.month,
  date: d.date,
  status: d.status,
});

const toGroup = (d: WithId<GroupDoc>): Group => ({
  id: d._id.toHexString(),
  tournamentId: d.tournamentId.toHexString(),
  name: d.name,
  order: d.order,
  method: d.method,
  size: d.size,
  participants: d.participants.map((p) => ({
    code: p.code,
    ...(p.side ? { side: p.side } : {}),
    memberId: p.memberId ? p.memberId.toHexString() : null,
    displayName: p.displayName,
  })),
  matches: d.matches.map((m) => ({
    order: m.order,
    teamA: m.teamA,
    teamB: m.teamB,
    scoreA: m.scoreA,
    scoreB: m.scoreB,
  })),
  awards: d.awards,
});

/** 회원 표시 이름: 닉네임이 있으면 "이름(닉네임)" */
export const memberLabel = (m: { name: string; nickname?: string }) =>
  m.nickname ? `${m.name}(${m.nickname})` : m.name;

// ───────────────────────── 회원 ─────────────────────────

export async function listMembers(opts: { activeOnly?: boolean } = {}): Promise<Member[]> {
  const db = await getDb();
  const filter = opts.activeOnly ? { isActive: true } : {};
  const docs = await members(db).find(filter).sort({ name: 1, nickname: 1 }).toArray();
  return docs.map(toMember);
}

export async function getMember(id: string): Promise<Member> {
  const db = await getDb();
  const d = await members(db).findOne({ _id: oid(id, "회원") });
  if (!d) throw notFound("회원");
  return toMember(d);
}

function isDuplicateKey(e: unknown): boolean {
  return typeof e === "object" && e !== null && (e as { code?: number }).code === 11000;
}

export async function createMember(input: { name: string; nickname?: string }): Promise<Member> {
  const db = await getDb();
  const doc: MemberDoc = {
    name: input.name.trim(),
    nickname: input.nickname?.trim() ?? "",
    isActive: true,
    createdAt: new Date(),
  };
  try {
    const r = await members(db).insertOne(doc);
    return toMember({ ...doc, _id: r.insertedId });
  } catch (e) {
    if (isDuplicateKey(e)) throw conflict("같은 이름·닉네임의 회원이 이미 있습니다. 닉네임으로 구분해 주세요.");
    throw e;
  }
}

export async function updateMember(
  id: string,
  patch: { name?: string; nickname?: string; isActive?: boolean },
): Promise<Member> {
  const db = await getDb();
  const $set: Partial<MemberDoc> = {};
  if (patch.name !== undefined) $set.name = patch.name.trim();
  if (patch.nickname !== undefined) $set.nickname = patch.nickname.trim();
  if (patch.isActive !== undefined) $set.isActive = patch.isActive;
  try {
    const d = await members(db).findOneAndUpdate({ _id: oid(id, "회원") }, { $set }, { returnDocument: "after" });
    if (!d) throw notFound("회원");
    return toMember(d);
  } catch (e) {
    if (isDuplicateKey(e)) throw conflict("같은 이름·닉네임의 회원이 이미 있습니다.");
    throw e;
  }
}

/** 대회 기록이 있는 회원은 삭제 대신 비활성화만 허용 (통계 고아화 방지) */
export async function deleteMember(id: string): Promise<void> {
  const db = await getDb();
  const _id = oid(id, "회원");
  const used = await groups(db).countDocuments({ "participants.memberId": _id }, { limit: 1 });
  if (used > 0) throw conflict("대회 기록이 있는 회원은 삭제할 수 없습니다. 비활성화를 사용해 주세요.");
  const r = await members(db).deleteOne({ _id });
  if (r.deletedCount === 0) throw notFound("회원");
}

// ───────────────────────── 대회 ─────────────────────────

export interface TournamentSummary extends Tournament {
  groups: { id: string; name: string; size: number }[];
}

export async function listTournaments(opts: { year?: number } = {}): Promise<TournamentSummary[]> {
  const db = await getDb();
  const filter = opts.year ? { year: opts.year } : {};
  const ts = await tournaments(db).find(filter).sort({ date: -1, _id: -1 }).toArray();
  const gs = await groups(db)
    .find({ tournamentId: { $in: ts.map((t) => t._id) } }, { projection: { tournamentId: 1, name: 1, size: 1, order: 1 } })
    .sort({ order: 1 })
    .toArray();
  return ts.map((t) => ({
    ...toTournament(t),
    groups: gs
      .filter((g) => g.tournamentId.equals(t._id))
      .map((g) => ({ id: g._id.toHexString(), name: g.name, size: g.size })),
  }));
}

export async function listYears(): Promise<number[]> {
  const db = await getDb();
  const years = await tournaments(db).distinct("year");
  return (years as number[]).sort((a, b) => b - a);
}

export async function createTournament(input: { date: string; title?: string }): Promise<Tournament> {
  const db = await getDb();
  const [y, m] = input.date.split("-").map(Number);
  const doc: TournamentDoc = {
    title: input.title?.trim() || `${y}년 ${m}월 월례대회`,
    year: y,
    month: m,
    date: input.date,
    status: "IN_PROGRESS",
    createdAt: new Date(),
  };
  const r = await tournaments(db).insertOne(doc);
  return toTournament({ ...doc, _id: r.insertedId });
}

export interface GroupView extends Group {
  /** AA: 단일 표, AB: A그룹·B그룹 표 */
  standings: StandingTable[];
  playedCount: number;
}

export interface TournamentDetail {
  tournament: Tournament;
  groups: GroupView[];
}

export async function getTournamentDetail(id: string): Promise<TournamentDetail> {
  const db = await getDb();
  const _id = oid(id, "대회");
  const t = await tournaments(db).findOne({ _id });
  if (!t) throw notFound("대회");
  const gs = await groups(db).find({ tournamentId: _id }).sort({ order: 1 }).toArray();
  return {
    tournament: toTournament(t),
    groups: gs.map(toGroup).map((g) => ({
      ...g,
      standings: groupStandings(g),
      playedCount: g.matches.filter(isPlayed).length,
    })),
  };
}

/** 진행 중인 대회 중 최신 1건 (없으면 가장 최근 대회) */
export async function getFeaturedTournamentId(): Promise<string | null> {
  const db = await getDb();
  // 진행 중인 대회만 대상 (없으면 홈 화면에서 안내 화면을 표시)
  const t = await tournaments(db).findOne({ status: "IN_PROGRESS" }, { sort: { date: -1, _id: -1 } });
  return t ? t._id.toHexString() : null;
}

async function requireOpenTournament(db: Db, _id: ObjectId): Promise<WithId<TournamentDoc>> {
  const t = await tournaments(db).findOne({ _id });
  if (!t) throw notFound("대회");
  if (t.status === "COMPLETED") throw conflict("종료된 대회는 수정할 수 없습니다. 먼저 잠금을 해제해 주세요.");
  return t;
}

export async function updateTournament(id: string, patch: { title?: string; date?: string }): Promise<Tournament> {
  const db = await getDb();
  const _id = oid(id, "대회");
  await requireOpenTournament(db, _id);
  const $set: Partial<TournamentDoc> = {};
  if (patch.title !== undefined) $set.title = patch.title.trim();
  if (patch.date !== undefined) {
    const [y, m] = patch.date.split("-").map(Number);
    Object.assign($set, { date: patch.date, year: y, month: m });
  }
  const d = await tournaments(db).findOneAndUpdate({ _id }, { $set }, { returnDocument: "after" });
  return toTournament(d!);
}

/** 점수가 하나도 입력되지 않은 진행 중 대회만 삭제 가능 */
export async function deleteTournament(id: string): Promise<void> {
  const db = await getDb();
  const _id = oid(id, "대회");
  const t = await tournaments(db).findOne({ _id });
  if (!t) throw notFound("대회");
  // 종료된 대회는 기록째 삭제 가능. 진행 중 대회는 실수 방지를 위해 점수가 없을 때만 삭제
  if (t.status !== "COMPLETED") {
    const scored = await groups(db).countDocuments(
      { tournamentId: _id, matches: { $elemMatch: { scoreA: { $ne: null } } } },
      { limit: 1 },
    );
    if (scored > 0) throw conflict("점수가 입력된 진행 중 대회는 삭제할 수 없습니다.");
  }
  await groups(db).deleteMany({ tournamentId: _id });
  await tournaments(db).deleteOne({ _id });
}

// ───────────────────────── 그룹 ─────────────────────────

export interface CreateGroupInput {
  name: string;
  method: MatchMethod;
  size: number;
  entries: (EntryInput & { register?: boolean })[];
}

export async function createGroup(tournamentId: string, input: CreateGroupInput, rng?: () => number): Promise<Group> {
  const db = await getDb();
  const tid = oid(tournamentId, "대회");
  await requireOpenTournament(db, tid);

  if (!isSupported(input.method, input.size)) throw badRequest("지원하지 않는 인원수입니다.");

  // 명부 회원 확인 + 이름 스냅샷 정규화
  const memberIds = input.entries.filter((e) => e.memberId).map((e) => oid(e.memberId!, "회원"));
  const found = await members(db).find({ _id: { $in: memberIds } }).toArray();
  const byId = new Map(found.map((m) => [m._id.toHexString(), m]));
  if (byId.size !== new Set(memberIds.map((i) => i.toHexString())).size) throw badRequest("존재하지 않는 회원이 포함되어 있습니다.");

  // 같은 대회의 다른 그룹에 이미 참가한 회원은 중복 참가 불가
  const dup = await groups(db).findOne({ tournamentId: tid, "participants.memberId": { $in: memberIds } });
  if (dup) {
    const names = dup.participants
      .filter((p) => p.memberId && memberIds.some((i) => i.equals(p.memberId!)))
      .map((p) => p.displayName);
    throw conflict(`이미 '${dup.name}'에 참가 중인 회원이 있습니다: ${names.join(", ")}`);
  }

  // 코드 배정을 먼저 검증(인원·조·중복)한 뒤, 게스트 명부 등록은 마지막에 수행
  const entries: EntryInput[] = input.entries.map((e) => {
    const m = e.memberId ? byId.get(e.memberId)! : null;
    return { memberId: e.memberId ?? null, displayName: m ? memberLabel(toMember(m)) : e.displayName, side: e.side };
  });
  let participants: ReturnType<typeof assignCodes>;
  try {
    participants = assignCodes(input.method, input.size, entries, rng);
  } catch (e) {
    // 인원수·조 구성·중복 참가자 등 입력 검증 오류
    throw badRequest(e instanceof Error ? e.message : String(e));
  }

  for (let i = 0; i < input.entries.length; i++) {
    const e = input.entries[i];
    if (!e.memberId && e.register) {
      const m = await createMember({ name: e.displayName });
      const p = participants.find((p) => p.memberId === null && p.displayName === e.displayName.trim());
      if (p) p.memberId = m.id;
    }
  }

  const order = (await groups(db).countDocuments({ tournamentId: tid })) + 1;
  const doc: GroupDoc = {
    tournamentId: tid,
    name: input.name.trim(),
    order,
    method: input.method,
    size: input.size,
    participants: participants.map((p) => ({ ...p, memberId: p.memberId ? new ObjectId(p.memberId) : null })),
    matches: generateMatches(input.method, input.size),
    createdAt: new Date(),
  };
  const r = await groups(db).insertOne(doc);
  return toGroup({ ...doc, _id: r.insertedId });
}

async function requireOpenGroup(db: Db, groupId: string): Promise<WithId<GroupDoc>> {
  const g = await groups(db).findOne({ _id: oid(groupId, "그룹") });
  if (!g) throw notFound("그룹");
  await requireOpenTournament(db, g.tournamentId);
  return g;
}

export async function deleteGroup(groupId: string): Promise<void> {
  const db = await getDb();
  const g = await requireOpenGroup(db, groupId);
  if (g.matches.some(isPlayed)) throw conflict("점수가 입력된 그룹은 삭제할 수 없습니다.");
  await groups(db).deleteOne({ _id: g._id });
  // 남은 그룹 순서 재정렬
  const rest = await groups(db).find({ tournamentId: g.tournamentId }).sort({ order: 1 }).toArray();
  await Promise.all(rest.map((r, i) => groups(db).updateOne({ _id: r._id }, { $set: { order: i + 1 } })));
}

/** 점수 입력/수정. score가 null이면 입력 취소 */
export async function setMatchScore(
  groupId: string,
  order: number,
  score: { scoreA: number; scoreB: number } | null,
): Promise<Match> {
  const db = await getDb();
  const g = await requireOpenGroup(db, groupId);
  if (!g.matches.some((m) => m.order === order)) throw notFound("경기");
  if (score) {
    const v = validateScore(score.scoreA, score.scoreB);
    if (!v.ok) throw badRequest(v.error);
  }
  // 경기 단위 $set → 다른 경기 동시 입력과 충돌하지 않음
  const d = await groups(db).findOneAndUpdate(
    { _id: g._id, "matches.order": order },
    {
      $set: {
        "matches.$.scoreA": score?.scoreA ?? null,
        "matches.$.scoreB": score?.scoreB ?? null,
        "matches.$.updatedAt": new Date(),
      },
    },
    { returnDocument: "after" },
  );
  const m = d!.matches.find((m) => m.order === order)!;
  return { order: m.order, teamA: m.teamA, teamB: m.teamB, scoreA: m.scoreA, scoreB: m.scoreB };
}

// ───────────────────────── 종료 / 잠금 ─────────────────────────

/** 대회 종료: 모든 그룹의 우승 2명·준우승 2명(필수), 3위 2명(선택)을 확정하고 잠근다 */
export async function completeTournament(id: string, awards: Record<string, Awards>): Promise<Tournament> {
  const db = await getDb();
  const _id = oid(id, "대회");
  await requireOpenTournament(db, _id);
  const gs = await groups(db).find({ tournamentId: _id }).toArray();
  if (gs.length === 0) throw badRequest("그룹이 없는 대회는 종료할 수 없습니다.");

  for (const g of gs) {
    const a = awards[g._id.toHexString()];
    if (!a) throw badRequest(`'${g.name}' 그룹의 수상자가 입력되지 않았습니다.`);
    const codes = [...a.winners, ...a.runnersUp, ...(a.third ?? [])];
    const valid = new Set(g.participants.map((p) => p.code));
    if (new Set(codes).size !== codes.length || !codes.every((c) => valid.has(c))) {
      throw badRequest(`'${g.name}' 그룹의 수상자는 서로 다른 참가자로 선택해 주세요.`);
    }
  }
  for (const g of gs) {
    const a = awards[g._id.toHexString()];
    const saved: Awards = { winners: a.winners, runnersUp: a.runnersUp, ...(a.third ? { third: a.third } : {}) };
    await groups(db).updateOne({ _id: g._id }, { $set: { awards: saved } });
  }
  const t = await tournaments(db).findOneAndUpdate(
    { _id, status: "IN_PROGRESS" },
    { $set: { status: "COMPLETED", completedAt: new Date() } },
    { returnDocument: "after" },
  );
  if (!t) throw conflict("이미 종료된 대회입니다.");
  return toTournament(t);
}

export async function reopenTournament(id: string): Promise<Tournament> {
  const db = await getDb();
  const t = await tournaments(db).findOneAndUpdate(
    { _id: oid(id, "대회"), status: "COMPLETED" },
    { $set: { status: "IN_PROGRESS" }, $unset: { completedAt: "" } },
    { returnDocument: "after" },
  );
  if (!t) throw new HttpError(409, "종료 상태인 대회만 잠금 해제할 수 있습니다.");
  return toTournament(t);
}

// ───────────────────────── 통계 / 명예의 전당 ─────────────────────────

async function completedRecords(db: Db): Promise<TournamentRecord[]> {
  const ts = await tournaments(db).find({ status: "COMPLETED" }).toArray();
  const gs = await groups(db).find({ tournamentId: { $in: ts.map((t) => t._id) } }).toArray();
  return ts.map((t) => ({
    tournament: toTournament(t),
    groups: gs.filter((g) => g.tournamentId.equals(t._id)).map(toGroup),
  }));
}

export interface MemberStatsRow extends Omit<MemberStats, "history"> {
  name: string;
  label: string;
  isActive: boolean;
}

/** 회원별 누적 통계 랭킹 (대회 참가 이력이 있는 회원만) */
export async function getMemberStatsList(): Promise<MemberStatsRow[]> {
  const db = await getDb();
  const [records, ms] = await Promise.all([completedRecords(db), members(db).find().toArray()]);
  const stats = computeMemberStats(records);
  return ms
    .filter((m) => stats.has(m._id.toHexString()))
    .map((m) => {
      const s: Partial<MemberStats> = { ...stats.get(m._id.toHexString())! };
      delete s.history;
      return { ...(s as Omit<MemberStats, "history">), name: m.name, label: memberLabel(toMember(m)), isActive: m.isActive };
    })
    .sort(compareMemberStats);
}

export async function getMemberDetail(id: string): Promise<{ member: Member; stats: MemberStats | null }> {
  const db = await getDb();
  const member = await getMember(id);
  const stats = computeMemberStats(await completedRecords(db)).get(id) ?? null;
  return { member, stats };
}

export async function getHallOfFame(year?: number) {
  const db = await getDb();
  return buildHallOfFame(await completedRecords(db), year);
}

// ───────────────────────── 공지사항 ─────────────────────────

interface NoticeDoc {
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

const notices = (db: Db) => db.collection<NoticeDoc>("notices");

const toNotice = (d: WithId<NoticeDoc>): NoticeItem => ({
  id: d._id.toHexString(),
  title: d.title,
  content: d.content,
  createdAt: d.createdAt.toISOString(),
  updatedAt: d.updatedAt.toISOString(),
});

/** 최신순. 사용자 화면 한줄 공지는 첫 번째 항목을 표시하고, 나머지는 이전/다음글로 이동 */
export async function listNotices(): Promise<NoticeItem[]> {
  const db = await getDb();
  const docs = await notices(db).find().sort({ createdAt: -1, _id: -1 }).toArray();
  return docs.map(toNotice);
}


export async function createNotice(input: { title: string; content: string }): Promise<NoticeItem> {
  const db = await getDb();
  const now = new Date();
  const doc: NoticeDoc = { title: input.title, content: input.content, createdAt: now, updatedAt: now };
  const { insertedId } = await notices(db).insertOne(doc);
  return toNotice({ ...doc, _id: insertedId });
}

export async function updateNotice(id: string, patch: { title?: string; content?: string }): Promise<NoticeItem> {
  const db = await getDb();
  const d = await notices(db).findOneAndUpdate(
    { _id: oid(id, "공지사항") },
    { $set: { ...patch, updatedAt: new Date() } },
    { returnDocument: "after" },
  );
  if (!d) throw notFound("공지사항");
  return toNotice(d);
}

export async function deleteNotice(id: string): Promise<void> {
  const db = await getDb();
  const r = await notices(db).deleteOne({ _id: oid(id, "공지사항") });
  if (r.deletedCount === 0) throw notFound("공지사항");
}

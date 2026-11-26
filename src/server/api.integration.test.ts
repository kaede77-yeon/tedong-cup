// Route Handler + repo 통합 테스트 (메모리 MongoDB)
import { MongoMemoryServer } from "mongodb-memory-server";
import { MongoClient } from "mongodb";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

process.env.ADMIN_PASSWORD = "test-pw";
process.env.SESSION_SECRET = "test-secret";
process.env.MONGODB_URI = "mongodb://unused";

const { __setClientForTest, getDb } = await import("./db");
const { createSessionToken, SESSION_COOKIE } = await import("./auth");
const session = await import("@/app/api/auth/session/route");
const membersRoute = await import("@/app/api/members/route");
const memberRoute = await import("@/app/api/members/[id]/route");
const tournamentsRoute = await import("@/app/api/tournaments/route");
const tournamentRoute = await import("@/app/api/tournaments/[id]/route");
const groupsRoute = await import("@/app/api/tournaments/[id]/groups/route");
const completeRoute = await import("@/app/api/tournaments/[id]/complete/route");
const reopenRoute = await import("@/app/api/tournaments/[id]/reopen/route");
const matchRoute = await import("@/app/api/groups/[id]/matches/[order]/route");
const statsRoute = await import("@/app/api/stats/members/route");
const hofRoute = await import("@/app/api/hall-of-fame/route");

let mongod: MongoMemoryServer;
let client: MongoClient;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  client = await new MongoClient(mongod.getUri("test")).connect();
  __setClientForTest(client);
}, 120_000);

afterAll(async () => {
  await client?.close();
  await mongod?.stop();
});

beforeEach(async () => {
  const db = await getDb();
  await Promise.all(["members", "tournaments", "groups"].map((c) => db.collection(c).deleteMany({})));
});

const admin = `${SESSION_COOKIE}=${createSessionToken()}`;

function req(method: string, url: string, body?: unknown, auth = true): NextRequest {
  return new NextRequest(new URL(url, "http://localhost"), {
    method,
    headers: { "content-type": "application/json", ...(auth ? { cookie: admin } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
// RouteContext 흉내
const ctx = <T extends Record<string, string>>(params: T) => ({ params: Promise.resolve(params) }) as never;
const json = (r: Response) => r.json();

async function seedMembers(n: number): Promise<string[]> {
  const ids: string[] = [];
  for (let i = 1; i <= n; i++) {
    const r = await membersRoute.POST(req("POST", "/api/members", { name: `회원${i}` }));
    ids.push((await json(r)).id);
  }
  return ids;
}

async function newTournament(date = "2026-11-28") {
  return json(await tournamentsRoute.POST(req("POST", "/api/tournaments", { date })));
}

describe("인증", () => {
  it("잘못된 비밀번호는 401, 올바르면 쿠키 발급", async () => {
    const bad = await session.POST(req("POST", "/api/auth/session", { password: "x" }, false));
    expect(bad.status).toBe(401);
    const ok = await session.POST(req("POST", "/api/auth/session", { password: "test-pw" }, false));
    expect(ok.status).toBe(200);
    expect(ok.headers.get("set-cookie")).toContain(`${SESSION_COOKIE}=`);
    expect(ok.headers.get("set-cookie")).toMatch(/HttpOnly/i);
  });

  it("인증 없는 쓰기 요청은 모두 401", async () => {
    const results = await Promise.all([
      membersRoute.POST(req("POST", "/api/members", { name: "a" }, false)),
      memberRoute.PATCH(req("PATCH", "/x", { isActive: false }, false), ctx({ id: "x" })),
      memberRoute.DELETE(req("DELETE", "/x", undefined, false), ctx({ id: "x" })),
      tournamentsRoute.POST(req("POST", "/x", { date: "2026-11-28" }, false)),
      tournamentRoute.PATCH(req("PATCH", "/x", {}, false), ctx({ id: "x" })),
      tournamentRoute.DELETE(req("DELETE", "/x", undefined, false), ctx({ id: "x" })),
      groupsRoute.POST(req("POST", "/x", {}, false), ctx({ id: "x" })),
      completeRoute.POST(req("POST", "/x", {}, false), ctx({ id: "x" })),
      reopenRoute.POST(req("POST", "/x", undefined, false), ctx({ id: "x" })),
      matchRoute.PATCH(req("PATCH", "/x", { scoreA: 6, scoreB: 1 }, false), ctx({ id: "x", order: "1" })),
    ]);
    expect(results.map((r) => r.status)).toEqual(Array(10).fill(401));
  });

  it("위조된 쿠키는 거부", async () => {
    const r = new NextRequest("http://localhost/api/members", {
      method: "POST",
      headers: { cookie: `${SESSION_COOKIE}=admin.9999999999.forged` },
      body: JSON.stringify({ name: "a" }),
    });
    expect((await membersRoute.POST(r)).status).toBe(401);
  });
});

describe("회원", () => {
  it("동명이인은 닉네임으로 구분, 완전 중복은 409", async () => {
    expect((await membersRoute.POST(req("POST", "/", { name: "김철수" }))).status).toBe(201);
    expect((await membersRoute.POST(req("POST", "/", { name: "김철수", nickname: "B" }))).status).toBe(201);
    expect((await membersRoute.POST(req("POST", "/", { name: "김철수" }))).status).toBe(409);
  });
});

describe("대회 전체 흐름", () => {
  it("생성 → 그룹(AA 5명, 게스트 포함) → 점수 → 순위 → 종료 → 잠금 → 통계/명예의 전당 → 잠금 해제", async () => {
    const ids = await seedMembers(4);
    const t = await newTournament();
    expect(t.title).toBe("2026년 11월 월례대회");

    const entries = [
      ...ids.map((id) => ({ memberId: id, displayName: "무시됨" })),
      { memberId: null, displayName: "게스트김" },
    ];
    const gRes = await groupsRoute.POST(
      req("POST", "/", { name: "금배조", method: "HANUL_AA", size: 5, entries }),
      ctx({ id: t.id }),
    );
    expect(gRes.status).toBe(201);
    const g = await json(gRes);
    expect(g.matches).toHaveLength(5);
    expect(g.participants.map((p: { code: string }) => p.code).sort().join("")).toBe("12345");
    // 회원 이름은 명부 기준으로 스냅샷
    expect(g.participants.some((p: { displayName: string }) => p.displayName === "무시됨")).toBe(false);

    // 잘못된 점수 400, 없는 경기 404
    expect((await matchRoute.PATCH(req("PATCH", "/", { scoreA: 7, scoreB: 5 }), ctx({ id: g.id, order: "1" }))).status).toBe(400);
    expect((await matchRoute.PATCH(req("PATCH", "/", { scoreA: 6, scoreB: 5 }), ctx({ id: g.id, order: "99" }))).status).toBe(404);

    const scores: [number, number][] = [[6, 4], [6, 2], [3, 6], [6, 5], [6, 0]];
    for (let i = 0; i < 5; i++) {
      const r = await matchRoute.PATCH(
        req("PATCH", "/", { scoreA: scores[i][0], scoreB: scores[i][1] }),
        ctx({ id: g.id, order: String(i + 1) }),
      );
      expect(r.status).toBe(200);
    }
    // 입력 취소 후 재입력
    await matchRoute.PATCH(req("PATCH", "/", null), ctx({ id: g.id, order: "5" }));
    let detail = await json(await tournamentRoute.GET(req("GET", "/", undefined, false), ctx({ id: t.id })));
    expect(detail.groups[0].playedCount).toBe(4);
    await matchRoute.PATCH(req("PATCH", "/", { scoreA: 6, scoreB: 0 }), ctx({ id: g.id, order: "5" }));

    detail = await json(await tournamentRoute.GET(req("GET", "/", undefined, false), ctx({ id: t.id })));
    const standings = detail.groups[0].standings[0].rows;
    expect(standings).toHaveLength(5);
    expect(standings.every((r: { played: number }) => r.played === 4)).toBe(true);

    // 수상자 검증 실패 (중복 코드) → 400
    const badAwards = { [g.id]: { winners: ["1", "2"], runnersUp: ["2", "3"] } };
    expect((await completeRoute.POST(req("POST", "/", { awards: badAwards }), ctx({ id: t.id }))).status).toBe(400);

    // 3위는 1명만 입력 불가(2명 또는 생략), 다른 수상자와 중복 불가
    const third1 = { [g.id]: { winners: ["1", "2"], runnersUp: ["3", "4"], third: ["5"] } };
    expect((await completeRoute.POST(req("POST", "/", { awards: third1 }), ctx({ id: t.id }))).status).toBe(400);
    const thirdDup = { [g.id]: { winners: ["1", "2"], runnersUp: ["3", "4"], third: ["4", "5"] } };
    expect((await completeRoute.POST(req("POST", "/", { awards: thirdDup }), ctx({ id: t.id }))).status).toBe(400);

    // 결정전 결과로 수상자 지정 (리그 순위와 무관). 5명 그룹이라 3위는 생략
    const top = standings.map((r: { code: string }) => r.code);
    const awards = { [g.id]: { winners: [top[3], top[4]], runnersUp: [top[0], top[1]] } };
    const done = await completeRoute.POST(req("POST", "/", { awards }), ctx({ id: t.id }));
    expect(done.status).toBe(200);
    expect((await json(done)).status).toBe("COMPLETED");

    // 잠긴 대회 수정 → 409
    expect((await matchRoute.PATCH(req("PATCH", "/", { scoreA: 6, scoreB: 1 }), ctx({ id: g.id, order: "1" }))).status).toBe(409);
    expect((await tournamentRoute.PATCH(req("PATCH", "/", { title: "x" }), ctx({ id: t.id }))).status).toBe(409);
    expect((await groupsRoute.POST(req("POST", "/", { name: "x", method: "HANUL_AA", size: 5, entries }), ctx({ id: t.id }))).status).toBe(409);

    // 통계: 게스트 제외 4명, 모두 4경기
    const stats = await json(await statsRoute.GET());
    expect(stats).toHaveLength(4);
    expect(stats.every((s: { played: number; tournaments: number }) => s.played === 4 && s.tournaments === 1)).toBe(true);
    expect(stats.reduce((n: number, s: { titles: number }) => n + s.titles, 0)).toBeLessThanOrEqual(2);

    // 명예의 전당
    const hof = await json(await hofRoute.GET(req("GET", "/api/hall-of-fame", undefined, false)));
    expect(hof).toHaveLength(1);
    expect(hof[0].groups[0].winners).toHaveLength(2);

    // 기록 있는 회원 삭제 → 409, 비활성화는 가능
    expect((await memberRoute.DELETE(req("DELETE", "/"), ctx({ id: ids[0] }))).status).toBe(409);
    expect((await memberRoute.PATCH(req("PATCH", "/", { isActive: false }), ctx({ id: ids[0] }))).status).toBe(200);

    // 잠금 해제 후 수정 가능
    expect((await reopenRoute.POST(req("POST", "/"), ctx({ id: t.id }))).status).toBe(200);
    expect((await matchRoute.PATCH(req("PATCH", "/", { scoreA: 6, scoreB: 1 }), ctx({ id: g.id, order: "1" }))).status).toBe(200);
    // 진행 중이 되면 통계에서 빠진다
    expect(await json(await statsRoute.GET())).toHaveLength(0);
  });

  it("AB 방식: 조 인원 불균형 400, 같은 대회 다른 그룹 중복 참가 409, 게스트 명부 등록", async () => {
    const ids = await seedMembers(8);
    const t = await newTournament();
    const unbalanced = ids.map((id, i) => ({ memberId: id, displayName: "", side: i < 5 ? "A" : "B" }));
    const bad = await groupsRoute.POST(
      req("POST", "/", { name: "AB조", method: "HANUL_AB", size: 8, entries: unbalanced.map((e) => ({ ...e, displayName: "x" })) }),
      ctx({ id: t.id }),
    );
    expect(bad.status).toBe(400);

    const ok = await groupsRoute.POST(
      req("POST", "/", {
        name: "AB조",
        method: "HANUL_AB",
        size: 8,
        entries: ids.map((id, i) => ({ memberId: id, displayName: "x", side: i < 4 ? "A" : "B" })),
      }),
      ctx({ id: t.id }),
    );
    expect(ok.status).toBe(201);
    const g = await json(ok);
    for (const p of g.participants) {
      expect(p.side === "A" ? "1234" : "ABCD").toContain(p.code);
    }
    // AB 그룹 상세: A그룹·B그룹 순위표가 따로 내려온다
    const abDetail = await json(await tournamentRoute.GET(req("GET", "/", undefined, false), ctx({ id: t.id })));
    const tables = abDetail.groups[0].standings;
    expect(tables.map((x: { side: string }) => x.side)).toEqual(["A", "B"]);
    expect(tables.map((x: { rows: unknown[] }) => x.rows.length)).toEqual([4, 4]);

    const dup = await groupsRoute.POST(
      req("POST", "/", {
        name: "은배조",
        method: "HANUL_AA",
        size: 5,
        entries: [ids[0], null, null, null, null].map((id, i) => ({ memberId: id, displayName: `게스트${i}` })),
      }),
      ctx({ id: t.id }),
    );
    expect(dup.status).toBe(409);

    const withReg = await groupsRoute.POST(
      req("POST", "/", {
        name: "은배조",
        method: "HANUL_AA",
        size: 5,
        entries: [1, 2, 3, 4, 5].map((i) => ({ memberId: null, displayName: `신규${i}`, register: i === 1 })),
      }),
      ctx({ id: t.id }),
    );
    expect(withReg.status).toBe(201);
    const g2 = await json(withReg);
    expect(g2.order).toBe(2);
    expect(g2.participants.find((p: { displayName: string }) => p.displayName === "신규1").memberId).toBeTruthy();
    const all = await json(await membersRoute.GET(req("GET", "/api/members", undefined, false)));
    expect(all.map((m: { name: string }) => m.name)).toContain("신규1");
  });

  it("3위 포함 종료: 저장 후 명예의 전당·통계에 반영", async () => {
    const ids = await seedMembers(6);
    const t = await newTournament();
    const g = await json(
      await groupsRoute.POST(
        req("POST", "/", { name: "금배조", method: "HANUL_AA", size: 6, entries: ids.map((id) => ({ memberId: id, displayName: "x" })) }),
        ctx({ id: t.id }),
      ),
    );
    const done = await completeRoute.POST(
      req("POST", "/", { awards: { [g.id]: { winners: ["1", "2"], runnersUp: ["3", "4"], third: ["5", "6"] } } }),
      ctx({ id: t.id }),
    );
    expect(done.status).toBe(200);
    const detail = await json(await tournamentRoute.GET(req("GET", "/", undefined, false), ctx({ id: t.id })));
    expect(detail.groups[0].awards.third).toEqual(["5", "6"]);
    const hof = await json(await hofRoute.GET(req("GET", "/api/hall-of-fame", undefined, false)));
    expect(hof[0].groups[0].third).toHaveLength(2);
    const stats = await json(await statsRoute.GET());
    expect(stats.reduce((n: number, s: { thirds: number }) => n + s.thirds, 0)).toBe(2);
  });

  it("AA 12명은 2코트용 대진, variant 필드는 무시", async () => {
    const t = await newTournament();
    const entries = Array.from({ length: 12 }, (_, i) => ({ memberId: null, displayName: `g${i}` }));
    const g = await json(
      await groupsRoute.POST(req("POST", "/", { name: "A", method: "HANUL_AA", size: 12, variant: "2C", entries }), ctx({ id: t.id })),
    );
    expect(g.variant).toBeUndefined();
    expect(g.matches[3]).toMatchObject({ teamA: ["1", "5"], teamB: ["2", "6"] });
  });

  it("점수가 없는 대회만 삭제 가능", async () => {
    const t = await newTournament();
    const entries = Array.from({ length: 5 }, (_, i) => ({ memberId: null, displayName: `g${i}` }));
    const g = await json(await groupsRoute.POST(req("POST", "/", { name: "A", method: "HANUL_AA", size: 5, entries }), ctx({ id: t.id })));
    await matchRoute.PATCH(req("PATCH", "/", { scoreA: 6, scoreB: 1 }), ctx({ id: g.id, order: "1" }));
    expect((await tournamentRoute.DELETE(req("DELETE", "/"), ctx({ id: t.id }))).status).toBe(409);
    await matchRoute.PATCH(req("PATCH", "/", null), ctx({ id: g.id, order: "1" }));
    expect((await tournamentRoute.DELETE(req("DELETE", "/"), ctx({ id: t.id }))).status).toBe(204);
  });

  it("잘못된 ObjectId는 404", async () => {
    expect((await tournamentRoute.GET(req("GET", "/", undefined, false), ctx({ id: "nope" }))).status).toBe(404);
  });
});

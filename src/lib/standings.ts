import { isPlayed } from "./score";
import type { Group, Match, Participant, Side } from "./types";

export interface StandingRow {
  code: string;
  memberId: string | null;
  displayName: string;
  rank: number;
  /** 동일 순위자가 2명 이상이면 true (공동 순위 표기용) */
  tied: boolean;
  played: number;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  diff: number;
}

/**
 * 개인 순위 계산. 기준: 승수 → 득실차 → 다득점 → 모두 같으면 공동 순위.
 * 공동 순위 다음 순위는 건너뛴다 (예: 1, 2, 2, 4).
 * 점수가 입력되지 않은 경기는 집계에서 제외한다.
 */
export function calculateStandings(participants: Participant[], matches: Match[]): StandingRow[] {
  const rows = new Map<string, StandingRow>(
    participants.map((p) => [
      p.code,
      {
        code: p.code,
        memberId: p.memberId,
        displayName: p.displayName,
        rank: 0,
        tied: false,
        played: 0,
        wins: 0,
        losses: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        diff: 0,
      },
    ]),
  );

  for (const m of matches) {
    if (!isPlayed(m)) continue;
    const a = m.scoreA as number;
    const b = m.scoreB as number;
    const apply = (codes: string[], pf: number, pa: number) => {
      for (const c of codes) {
        const r = rows.get(c);
        if (!r) continue;
        r.played++;
        r.pointsFor += pf;
        r.pointsAgainst += pa;
        if (pf > pa) r.wins++;
        else r.losses++;
      }
    };
    apply(m.teamA, a, b);
    apply(m.teamB, b, a);
  }

  const list = [...rows.values()];
  for (const r of list) r.diff = r.pointsFor - r.pointsAgainst;

  const cmp = (x: StandingRow, y: StandingRow) =>
    y.wins - x.wins || y.diff - x.diff || y.pointsFor - x.pointsFor;

  // 동순위 안에서는 코드 순서로 안정 정렬 (표시 일관성)
  const order = participants.map((p) => p.code);
  list.sort((x, y) => cmp(x, y) || order.indexOf(x.code) - order.indexOf(y.code));

  list.forEach((r, i) => {
    r.rank = i > 0 && cmp(list[i - 1], r) === 0 ? list[i - 1].rank : i + 1;
  });
  const rankCount = new Map<number, number>();
  for (const r of list) rankCount.set(r.rank, (rankCount.get(r.rank) ?? 0) + 1);
  for (const r of list) r.tied = (rankCount.get(r.rank) ?? 0) > 1;

  return list;
}

export interface StandingTable {
  /** AB 방식의 조. AA 방식은 undefined (그룹 전체 단일 순위) */
  side?: Side;
  rows: StandingRow[];
}

/**
 * 그룹의 순위표 목록.
 * - 한울AA: 그룹 전체 단일 순위
 * - 한울AB: A그룹·B그룹 각각 따로 순위 (같은 조 안에서만 비교)
 */
export function groupStandings(group: Pick<Group, "method" | "participants" | "matches">): StandingTable[] {
  if (group.method !== "HANUL_AB") {
    return [{ rows: calculateStandings(group.participants, group.matches) }];
  }
  return (["A", "B"] as const).map((side) => ({
    side,
    rows: calculateStandings(
      group.participants.filter((p) => p.side === side),
      group.matches,
    ),
  }));
}

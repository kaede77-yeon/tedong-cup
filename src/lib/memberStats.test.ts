import { describe, expect, it } from "vitest";
import { buildHallOfFame } from "./hallOfFame";
import { compareMemberStats, computeMemberStats, winRate, type TournamentRecord } from "./memberStats";
import type { Group, Participant, Tournament } from "./types";

const T = (id: string, date: string, status: Tournament["status"] = "COMPLETED"): Tournament => ({
  id,
  title: `${date} 대회`,
  year: Number(date.slice(0, 4)),
  month: Number(date.slice(5, 7)),
  date,
  status,
});

const parts = (ids: (string | null)[]): Participant[] =>
  ids.map((id, i) => ({ code: String(i + 1), memberId: id, displayName: id ?? `게스트${i + 1}` }));

const G = (
  id: string,
  tid: string,
  ids: (string | null)[],
  scores: [number, number][],
  order = 1,
  third?: [string, string],
): Group => ({
  id,
  tournamentId: tid,
  name: `그룹${id}`,
  order,
  method: "HANUL_AA",
  size: 5,
  participants: parts(ids),
  // 5명 규칙표 앞 2경기: 12:34, 13:25
  matches: [
    { order: 1, teamA: ["1", "2"], teamB: ["3", "4"], scoreA: scores[0]?.[0] ?? null, scoreB: scores[0]?.[1] ?? null },
    { order: 2, teamA: ["1", "3"], teamB: ["2", "5"], scoreA: scores[1]?.[0] ?? null, scoreB: scores[1]?.[1] ?? null },
  ],
  awards: { winners: ["1", "2"], runnersUp: ["3", "4"], ...(third ? { third } : {}) },
});

describe("computeMemberStats", () => {
  const records: TournamentRecord[] = [
    { tournament: T("t1", "2026-10-10"), groups: [G("g1", "t1", ["kim", "lee", "park", null, "choi"], [[6, 4], [6, 2]])] },
    { tournament: T("t2", "2026-11-14"), groups: [G("g2", "t2", ["lee", "kim", "choi", "park", null], [[3, 6], [6, 5]])] },
    // 진행 중 대회는 제외
    { tournament: T("t3", "2026-12-12", "IN_PROGRESS"), groups: [G("g3", "t3", ["kim", "lee", "park", "choi", null], [[6, 0]])] },
  ];
  const stats = computeMemberStats(records);

  it("게스트와 진행 중 대회는 제외", () => {
    expect([...stats.keys()].sort()).toEqual(["choi", "kim", "lee", "park"]);
    expect(stats.get("kim")!.tournaments).toBe(2);
  });

  it("누적 승패·득실·승률·수상 횟수", () => {
    // t1: kim(1) 12:34 6:4 승, 13:25 6:2 승 → 2승 12득 6실
    // t2: kim(2) 12:34 3:6 패, 25 vs 13 → 13이 6:5 승이므로 kim 패 → 2패 8득 12실
    const kim = stats.get("kim")!;
    expect(kim).toMatchObject({ played: 4, wins: 2, losses: 2, pointsFor: 20, pointsAgainst: 18, diff: 2, winRate: 50 });
    expect(kim.titles).toBe(2); // 두 대회 모두 코드 1,2 → 우승
    expect(kim.history.map((h) => h.tournamentId)).toEqual(["t2", "t1"]); // 최신순
    // park: t1 코드3, t2 코드4 → 두 대회 모두 준우승. t3(진행 중)는 제외
    expect(stats.get("park")!.runnerUps).toBe(2);
  });

  it("3위(선택 입력) 집계: 입력된 그룹만 반영, 이력에 THIRD 표시", () => {
    const s = computeMemberStats([
      { tournament: T("t1", "2026-10-10"), groups: [G("g1", "t1", ["a", "b", "c", "d", "e", "f"], [], 1, ["5", "6"])] },
      { tournament: T("t2", "2026-11-14"), groups: [G("g2", "t2", ["e", "f", "a", "b", "c", "d"], [], 1)] },
    ]);
    expect(s.get("e")!.thirds).toBe(1); // t1 코드5
    expect(s.get("e")!.titles).toBe(1); // t2 코드1
    expect(s.get("e")!.history.map((h) => h.award)).toEqual(["WINNER", "THIRD"]);
    expect(s.get("a")!.thirds).toBe(0);
  });

  it("한울AB는 조 안에서의 순위·조 인원으로 이력을 남긴다", () => {
    const g: Group = {
      id: "ab",
      tournamentId: "t9",
      name: "혼복조",
      order: 1,
      method: "HANUL_AB",
      size: 8,
      participants: [
        ..."1234".split("").map((code) => ({ code, side: "A" as const, memberId: `a${code}`, displayName: `a${code}` })),
        ..."ABCD".split("").map((code) => ({ code, side: "B" as const, memberId: `b${code}`, displayName: `b${code}` })),
      ],
      matches: [{ order: 1, teamA: ["1", "A"], teamB: ["2", "B"], scoreA: 6, scoreB: 3 }],
    };
    const s = computeMemberStats([{ tournament: T("t9", "2026-11-01"), groups: [g] }]);
    expect(s.get("a1")!.history[0]).toMatchObject({ side: "A", rank: 1, groupSize: 4 });
    expect(s.get("bA")!.history[0]).toMatchObject({ side: "B", rank: 1, groupSize: 4 });
    expect(s.get("bB")!.history[0]).toMatchObject({ side: "B", rank: 4, tied: false });
  });

  it("winRate는 소수 첫째 자리, 경기 없으면 0", () => {
    expect(winRate(1, 3)).toBe(33.3);
    expect(winRate(2, 3)).toBe(66.7);
    expect(winRate(0, 0)).toBe(0);
  });

  it("랭킹 정렬: 우승 횟수 우선", () => {
    const list = [...stats.values()].sort(compareMemberStats);
    expect(list[0].titles).toBeGreaterThanOrEqual(list[1].titles);
  });
});

describe("buildHallOfFame", () => {
  const records: TournamentRecord[] = [
    { tournament: T("t1", "2025-12-13"), groups: [G("g1", "t1", ["a", "b", "c", "d", null], [])] },
    {
      tournament: T("t2", "2026-11-14"),
      groups: [G("g3", "t2", ["e", "f", "g", "h", "i"], [], 2), G("g2", "t2", ["a", null, "c", "d", "e"], [], 1)],
    },
    { tournament: T("t3", "2026-12-12", "IN_PROGRESS"), groups: [] },
  ];

  it("종료 대회만 최신순, 그룹 순서대로, 게스트 이름 포함", () => {
    const hof = buildHallOfFame(records);
    expect(hof.map((h) => h.tournamentId)).toEqual(["t2", "t1"]);
    expect(hof[0].groups.map((g) => g.groupId)).toEqual(["g2", "g3"]);
    expect(hof[0].groups[0].winners).toEqual([
      { memberId: "a", displayName: "a" },
      { memberId: null, displayName: "게스트2" },
    ]);
  });

  it("3위: 입력되면 이름 표시, 없으면 빈 배열", () => {
    const hof = buildHallOfFame([
      { tournament: T("t1", "2026-10-10"), groups: [G("g1", "t1", ["a", "b", "c", "d", "e", null], [], 1, ["5", "6"])] },
      { tournament: T("t2", "2026-11-14"), groups: [G("g2", "t2", ["a", "b", "c", "d", "e"], [], 1)] },
    ]);
    expect(hof[1].groups[0].third).toEqual([
      { memberId: "e", displayName: "e" },
      { memberId: null, displayName: "게스트6" },
    ]);
    expect(hof[0].groups[0].third).toEqual([]);
  });

  it("연도 필터", () => {
    expect(buildHallOfFame(records, 2025).map((h) => h.tournamentId)).toEqual(["t1"]);
  });
});

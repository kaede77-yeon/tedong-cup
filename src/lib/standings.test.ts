import { describe, expect, it } from "vitest";
import { calculateStandings, groupStandings } from "./standings";
import type { Match, Participant } from "./types";

const P = (codes: string): Participant[] =>
  codes.split("").map((code) => ({ code, memberId: `m${code}`, displayName: `선수${code}` }));

const M = (order: number, a: string, b: string, sa: number | null, sb: number | null): Match => ({
  order,
  teamA: [a[0], a[1]],
  teamB: [b[0], b[1]],
  scoreA: sa,
  scoreB: sb,
});

describe("calculateStandings", () => {
  it("경기가 없으면 전원 공동 1위, 0 기록", () => {
    const rows = calculateStandings(P("1234"), []);
    expect(rows.every((r) => r.rank === 1 && r.tied && r.played === 0)).toBe(true);
  });

  it("승수 → 득실차 → 다득점 순으로 정렬", () => {
    // 5명 규칙표 일부
    const rows = calculateStandings(P("12345"), [
      M(1, "12", "34", 6, 4), // 1,2 승 +2
      M(2, "13", "25", 6, 0), // 1,3 승 +6 / 2,5 패
      M(3, "14", "35", 3, 6), // 3,5 승 +3 / 1,4 패
    ]);
    const by = Object.fromEntries(rows.map((r) => [r.code, r]));
    expect(by["1"]).toMatchObject({ played: 3, wins: 2, losses: 1, pointsFor: 15, pointsAgainst: 10, diff: 5 });
    // 3: 패 4-6, 승 6-0, 승 6-3 → 득16 실9
    expect(by["3"]).toMatchObject({ wins: 2, losses: 1, pointsFor: 16, pointsAgainst: 9, diff: 7 });
    // 1·3 동률 2승 → 득실차(+7 > +5)로 3이 1위. 5(1승 -3) > 2(1승 -4) > 4(0승)
    expect(rows.map((r) => r.code)).toEqual(["3", "1", "5", "2", "4"]);
    expect(rows.map((r) => r.rank)).toEqual([1, 2, 3, 4, 5]);
  });

  it("득실차가 같으면 다득점으로 가른다", () => {
    const rows = calculateStandings(P("123456"), [
      M(1, "12", "56", 6, 0), // 1: 승 6-0
      M(2, "13", "56", 0, 6), // 1: 패 0-6 → 1승 득6 실6 (득실 0)
      M(3, "45", "26", 6, 5), // 4: 승 6-5
      M(4, "34", "26", 5, 6), // 4: 패 5-6 → 1승 득11 실11 (득실 0)
    ]);
    const by = Object.fromEntries(rows.map((r) => [r.code, r]));
    expect(by["1"]).toMatchObject({ wins: 1, diff: 0, pointsFor: 6 });
    expect(by["4"]).toMatchObject({ wins: 1, diff: 0, pointsFor: 11 });
    // 승수·득실차 동일 → 다득점이 많은 4가 앞선다
    expect(by["4"].rank).toBeLessThan(by["1"].rank);
    expect(by["4"].tied).toBe(false);
  });

  it("공동 순위는 다음 순위를 건너뛴다 (1, 2, 2, 4)", () => {
    const rows = calculateStandings(P("1234"), [
      M(1, "12", "34", 6, 3),
      M(2, "13", "24", 6, 3),
    ]);
    // 1: 2승 +6 / 2: 1승1패 0 득점9 / 3: 1승1패 0 득점9 / 4: 2패 -6
    expect(rows.map((r) => [r.code, r.rank, r.tied])).toEqual([
      ["1", 1, false],
      ["2", 2, true],
      ["3", 2, true],
      ["4", 4, false],
    ]);
  });

  it("미입력 경기는 집계에서 제외", () => {
    const rows = calculateStandings(P("1234"), [M(1, "12", "34", null, null), M(2, "13", "24", 6, 2)]);
    const by = Object.fromEntries(rows.map((r) => [r.code, r]));
    expect(by["1"].played).toBe(1);
    expect(by["2"]).toMatchObject({ played: 1, losses: 1, diff: -4 });
  });

  it("B조 득점이 높은 경우 B팀 승리로 집계", () => {
    const rows = calculateStandings(P("1234"), [M(1, "12", "34", 2, 6)]);
    const by = Object.fromEntries(rows.map((r) => [r.code, r]));
    expect(by["3"].wins).toBe(1);
    expect(by["1"].losses).toBe(1);
  });
});

describe("groupStandings", () => {
  // AB 8명: A그룹 1~4, B그룹 A~D
  const ab: Participant[] = [
    ..."1234".split("").map((code) => ({ code, side: "A" as const, memberId: `m${code}`, displayName: `A${code}` })),
    ..."ABCD".split("").map((code) => ({ code, side: "B" as const, memberId: `m${code}`, displayName: `B${code}` })),
  ];

  it("한울AA는 그룹 전체 단일 순위표", () => {
    const t = groupStandings({ method: "HANUL_AA", participants: P("12345"), matches: [M(1, "12", "34", 6, 1)] });
    expect(t).toHaveLength(1);
    expect(t[0].side).toBeUndefined();
    expect(t[0].rows).toHaveLength(5);
  });

  it("한울AB는 A그룹·B그룹 각각 따로 순위 (조 안에서 1위부터)", () => {
    const t = groupStandings({
      method: "HANUL_AB",
      participants: ab,
      matches: [
        M(1, "1A", "2B", 6, 4), // 1, A 승
        M(2, "3C", "4D", 2, 6), // 4, D 승
        M(3, "1B", "3D", 6, 0), // 1, B 승
      ],
    });
    expect(t.map((x) => x.side)).toEqual(["A", "B"]);
    const [a, b] = t;
    expect(a.rows.map((r) => r.code).sort().join("")).toBe("1234");
    expect(b.rows.map((r) => r.code).sort().join("")).toBe("ABCD");
    // A그룹: 1(2승) 단독 1위
    expect(a.rows[0]).toMatchObject({ code: "1", rank: 1, wins: 2, tied: false });
    // B그룹: B(패4-6, 승6-0 → 1승 +4) > A(승6-4 → 1승 +2) > D(승6-2, 패0-6 → 1승 -2) > C(0승)
    expect(b.rows.map((r) => [r.code, r.rank])).toEqual([
      ["B", 1],
      ["A", 2],
      ["D", 3],
      ["C", 4],
    ]);
  });
});

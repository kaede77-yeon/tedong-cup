import { describe, expect, it } from "vitest";
import { assignCodes, generateMatches, shuffle, type EntryInput } from "./generateMatches";

/** 결정적 의사난수 (mulberry32) */
function seeded(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const people = (n: number, prefix = "p"): EntryInput[] =>
  Array.from({ length: n }, (_, i) => ({ memberId: `${prefix}${i + 1}`, displayName: `선수${prefix}${i + 1}` }));

describe("shuffle", () => {
  it("원소를 보존하고 원본을 변경하지 않는다", () => {
    const src = [1, 2, 3, 4, 5];
    const out = shuffle(src, seeded(1));
    expect([...out].sort()).toEqual(src);
    expect(src).toEqual([1, 2, 3, 4, 5]);
  });
  it("같은 시드면 같은 결과", () => {
    expect(shuffle([1, 2, 3, 4, 5, 6], seeded(7))).toEqual(shuffle([1, 2, 3, 4, 5, 6], seeded(7)));
  });
});

describe("assignCodes", () => {
  it("AA: N명에게 1..N 코드를 하나씩 배정", () => {
    const ps = assignCodes("HANUL_AA", 13, people(13), seeded(3));
    expect(ps.map((p) => p.code).join("")).toBe("123456789ABCD");
    expect(new Set(ps.map((p) => p.memberId)).size).toBe(13);
  });

  it("AA: 배정이 무작위다 (시드에 따라 달라짐)", () => {
    const a = assignCodes("HANUL_AA", 8, people(8), seeded(1)).map((p) => p.memberId);
    const b = assignCodes("HANUL_AA", 8, people(8), seeded(2)).map((p) => p.memberId);
    expect(a).not.toEqual(b);
  });

  it("AB: A조는 숫자, B조는 영문 코드만 받는다", () => {
    const entries = [
      ...people(6, "a").map((e) => ({ ...e, side: "A" as const })),
      ...people(6, "b").map((e) => ({ ...e, side: "B" as const })),
    ];
    const ps = assignCodes("HANUL_AB", 12, entries, seeded(5));
    for (const p of ps) {
      if (p.memberId!.startsWith("a")) {
        expect(p.side).toBe("A");
        expect("123456").toContain(p.code);
      } else {
        expect(p.side).toBe("B");
        expect("ABCDEF").toContain(p.code);
      }
    }
    expect(new Set(ps.map((p) => p.code)).size).toBe(12);
  });

  it("게스트(memberId=null)도 배정되고 이름 공백을 정리한다", () => {
    const entries: EntryInput[] = [...people(4), { memberId: null, displayName: "  게스트  " }];
    const ps = assignCodes("HANUL_AA", 5, entries, seeded(1));
    expect(ps.find((p) => p.memberId === null)?.displayName).toBe("게스트");
  });

  it("인원 불일치, 미지원 인원, 중복, AB 조 인원 불균형은 에러", () => {
    expect(() => assignCodes("HANUL_AA", 8, people(7))).toThrow(/8명이 필요/);
    expect(() => assignCodes("HANUL_AA", 4, people(4))).toThrow(/지원하지 않습니다/);
    expect(() => assignCodes("HANUL_AA", 5, [...people(4), people(1)[0]])).toThrow(/중복/);
    expect(() =>
      assignCodes("HANUL_AA", 5, [...people(3), { memberId: null, displayName: "김" }, { memberId: null, displayName: "김 " }]),
    ).toThrow(/중복/);
    const unbalanced = [
      ...people(5, "a").map((e) => ({ ...e, side: "A" as const })),
      ...people(3, "b").map((e) => ({ ...e, side: "B" as const })),
    ];
    expect(() => assignCodes("HANUL_AB", 8, unbalanced)).toThrow(/A그룹은 4명/);
  });
});

describe("generateMatches", () => {
  it("규칙표 순서대로 미입력 경기를 만든다", () => {
    const ms = generateMatches("HANUL_AB", 8);
    expect(ms).toHaveLength(8);
    expect(ms[0]).toEqual({ order: 1, teamA: ["1", "A"], teamB: ["2", "B"], scoreA: null, scoreB: null });
    expect(ms[7]).toMatchObject({ order: 8, teamA: ["3", "B"], teamB: ["2", "C"] });
  });

  it("AA 12명은 2코트용 순서표를 사용한다", () => {
    expect(generateMatches("HANUL_AA", 12)[3]).toMatchObject({ teamA: ["1", "5"], teamB: ["2", "6"] });
  });
});

import { describe, expect, it } from "vitest";
import rules from "@/data/hanulRules.json";
import { codesFor, getSchedule, ruleKey, SUPPORTED_SIZES } from "./hanulRules";
import type { MatchMethod } from "./types";

// 지원하는 모든 (방식, 인원) 조합
const cases: [MatchMethod, number][] = [];
for (const method of ["HANUL_AA", "HANUL_AB"] as const) {
  for (const size of SUPPORTED_SIZES[method]) cases.push([method, size]);
}

describe("한울 규칙표 불변식", () => {
  it("JSON의 모든 키가 검증 대상에 포함된다", () => {
    const keys = cases.map(([m, s]) => `${m}:${ruleKey(m, s)}`).sort();
    const jsonKeys = [
      ...Object.keys(rules.HANUL_AA).map((k) => `HANUL_AA:${k}`),
      ...Object.keys(rules.HANUL_AB).map((k) => `HANUL_AB:${k}`),
    ].sort();
    expect(keys).toEqual(jsonKeys);
  });

  it.each(cases)("%s %i명", (method, size) => {
    const schedule = getSchedule(method, size);
    const codes = codesFor(method, size);
    const valid = new Set(codes.map((c) => c.code));
    const sideOf = new Map(codes.map((c) => [c.code, c.side]));

    // 전체 경기 수 = 인원수
    expect(schedule).toHaveLength(size);

    const count = new Map<string, number>();
    const partners = new Set<string>();
    for (const g of schedule) {
      const players = [...g.teamA, ...g.teamB];
      // 한 경기 안에 같은 사람 중복 없음, 유효 코드만 사용
      expect(new Set(players).size).toBe(4);
      players.forEach((p) => {
        expect(valid.has(p)).toBe(true);
        count.set(p, (count.get(p) ?? 0) + 1);
      });
      for (const team of [g.teamA, g.teamB]) {
        // 같은 파트너 조합은 다시 나오지 않음
        const key = [...team].sort().join("");
        expect(partners.has(key)).toBe(false);
        partners.add(key);
        // AB: 파트너는 반드시 반대 그룹
        if (method === "HANUL_AB") expect(sideOf.get(team[0])).not.toBe(sideOf.get(team[1]));
      }
    }
    // 1인당 정확히 4경기
    expect([...count.values()].every((c) => c === 4)).toBe(true);
    expect(count.size).toBe(size);
  });

  it("AA 12명은 원본 2코트용: 4번째 경기 15:26, 연속 2경기씩 겹치는 선수 없음", () => {
    const s = getSchedule("HANUL_AA", 12);
    expect(s[3]).toMatchObject({ teamA: ["1", "5"], teamB: ["2", "6"] });
    for (let i = 0; i + 2 <= s.length; i += 2) {
      const players = s.slice(i, i + 2).flatMap((g) => [...g.teamA, ...g.teamB]);
      expect(new Set(players).size).toBe(8);
    }
  });

  it("지원하지 않는 인원은 에러", () => {
    expect(() => getSchedule("HANUL_AA", 4)).toThrow();
    expect(() => getSchedule("HANUL_AA", 17)).toThrow();
    expect(() => getSchedule("HANUL_AB", 9)).toThrow();
  });
});

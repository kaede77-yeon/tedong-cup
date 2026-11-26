import rules from "@/data/hanulRules.json";
import type { MatchMethod, Side } from "./types";

/** AA 방식 코드 순서 (1..9, A(10)..G(16)) */
export const AA_CODES = "123456789ABCDEFG";
/** AB 방식: A조는 숫자, B조는 영문 */
export const AB_SIDE_A_CODES = "12345678";
export const AB_SIDE_B_CODES = "ABCDEFGH";

export interface ScheduleEntry {
  order: number;
  teamA: [string, string];
  teamB: [string, string];
}

type RuleTable = Record<string, string[]>;
const TABLES: Record<MatchMethod, RuleTable> = {
  HANUL_AA: rules.HANUL_AA as RuleTable,
  HANUL_AB: rules.HANUL_AB as RuleTable,
};

export const SUPPORTED_SIZES: Record<MatchMethod, number[]> = {
  HANUL_AA: [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
  HANUL_AB: [8, 10, 12, 14, 16],
};

export function isSupported(method: MatchMethod, size: number): boolean {
  return SUPPORTED_SIZES[method].includes(size);
}

export function ruleKey(method: MatchMethod, size: number): string {
  if (!isSupported(method, size)) {
    throw new Error(`${method} 방식은 ${size}명을 지원하지 않습니다.`);
  }
  return String(size);
}

/** 인원수에 해당하는 경기 순서표 (AA 12명은 원본의 2코트용) */
export function getSchedule(method: MatchMethod, size: number): ScheduleEntry[] {
  const table = TABLES[method][ruleKey(method, size)];
  if (!table) throw new Error(`규칙표가 없습니다: ${method} ${size}명`);
  return table.map((s, i) => {
    const [a, b] = s.split(":");
    return { order: i + 1, teamA: [a[0], a[1]], teamB: [b[0], b[1]] };
  });
}

/** 인원수에 사용되는 코드 목록 (AB는 조 정보 포함) */
export function codesFor(method: MatchMethod, size: number): { code: string; side?: Side }[] {
  if (method === "HANUL_AA") {
    return AA_CODES.slice(0, size)
      .split("")
      .map((code) => ({ code }));
  }
  const half = size / 2;
  return [
    ...AB_SIDE_A_CODES.slice(0, half).split("").map((code) => ({ code, side: "A" as const })),
    ...AB_SIDE_B_CODES.slice(0, half).split("").map((code) => ({ code, side: "B" as const })),
  ];
}

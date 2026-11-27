import type { StandingRow, StandingTable } from "./standings";

export type AwardPlace = "winners" | "runnersUp" | "third";
export const AWARD_PLACES: AwardPlace[] = ["winners", "runnersUp", "third"];

export interface AwardSuggestion {
  /** 순위표로 정해진 자리만 채운다 (정할 수 없는 자리는 빈 배열) */
  picks: Record<AwardPlace, string[]>;
  /** 공동 순위가 자리 경계에 걸려 자동으로 정할 수 없는 자리 */
  unresolved: AwardPlace[];
}

/** rows[i] 가 앞뒤 사람과 동률이 아니어서 순위상 위치가 확정인지 */
const fixedAt = (rows: StandingRow[], i: number) =>
  i < rows.length && (i === 0 || rows[i - 1].rank !== rows[i].rank) && (i + 1 >= rows.length || rows[i + 1].rank !== rows[i].rank);

/** rows[from..to) 구간이 앞뒤 사람과 동률로 섞이지 않는지 (구간 안 동률은 무관) */
const blockFixed = (rows: StandingRow[], from: number, to: number) =>
  to <= rows.length && (from === 0 || rows[from - 1].rank !== rows[from].rank) && (to >= rows.length || rows[to - 1].rank !== rows[to].rank);

/**
 * 순위표대로 수상자 후보를 만든다 (관리자가 선택적으로 사용, 확정 전 수정 가능).
 * - 한울AA(표 1개): 1·2위 우승, 3·4위 준우승, 5·6위 3위
 * - 한울AB(A·B 표): 같은 순위의 A조·B조 선수를 한 팀으로 (1위끼리 우승, 2위끼리 준우승, 3위끼리 3위)
 * - 경기를 하나도 치르지 않았으면 순위가 의미 없으므로 모두 미정
 */
export function awardsFromStandings(tables: StandingTable[]): AwardSuggestion {
  const picks: Record<AwardPlace, string[]> = { winners: [], runnersUp: [], third: [] };
  const unresolved: AwardPlace[] = [];
  const played = tables.some((t) => t.rows.some((r) => r.played > 0));

  AWARD_PLACES.forEach((place, k) => {
    let codes: string[] | null = null;
    if (played && tables.length === 1) {
      const rows = tables[0].rows;
      if (blockFixed(rows, 2 * k, 2 * k + 2)) codes = rows.slice(2 * k, 2 * k + 2).map((r) => r.code);
    } else if (played && tables.length === 2) {
      const [a, b] = tables.map((t) => t.rows);
      if (fixedAt(a, k) && fixedAt(b, k)) codes = [a[k].code, b[k].code];
    }
    if (codes) picks[place] = codes;
    else unresolved.push(place);
  });

  return { picks, unresolved };
}

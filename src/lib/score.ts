import type { Match } from "./types";

export type ScoreValidation = { ok: true } | { ok: false; error: string };

/**
 * 1세트 6게임 선승제(5:5 타이브레이크) 점수 검증.
 * 유효: 한쪽이 정확히 6, 상대는 0~5 정수.
 */
export function validateScore(a: unknown, b: unknown): ScoreValidation {
  if (!Number.isInteger(a) || !Number.isInteger(b)) {
    return { ok: false, error: "점수는 정수여야 합니다." };
  }
  const x = a as number;
  const y = b as number;
  const valid = (w: number, l: number) => w === 6 && l >= 0 && l <= 5;
  if (valid(x, y) || valid(y, x)) return { ok: true };
  return { ok: false, error: "유효한 점수는 한쪽 6, 상대 0~5입니다. (예: 6:4)" };
}

export function isPlayed(m: Pick<Match, "scoreA" | "scoreB">): boolean {
  return m.scoreA !== null && m.scoreB !== null;
}

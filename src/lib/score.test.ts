import { describe, expect, it } from "vitest";
import { validateScore } from "./score";

describe("validateScore", () => {
  it.each([
    [6, 0], [6, 3], [6, 5], [0, 6], [5, 6],
  ])("%i:%i 유효", (a, b) => {
    expect(validateScore(a, b).ok).toBe(true);
  });

  it.each([
    [6, 6], [7, 5], [5, 4], [0, 0], [6, -1], [-1, 6], [6.5, 3], [6, 3.0001],
  ])("%d:%d 무효", (a, b) => {
    expect(validateScore(a, b).ok).toBe(false);
  });

  it("숫자가 아닌 값 거부", () => {
    expect(validateScore("6", 4).ok).toBe(false);
    expect(validateScore(null, 4).ok).toBe(false);
    expect(validateScore(6, undefined).ok).toBe(false);
  });
});

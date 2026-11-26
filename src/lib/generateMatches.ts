import { codesFor, getSchedule, isSupported } from "./hanulRules";
import type { Match, MatchMethod, Participant, Side } from "./types";

export type Rng = () => number;

/** Fisher–Yates 셔플 (원본 불변). rng 주입으로 테스트 결정성 확보 */
export function shuffle<T>(arr: readonly T[], rng: Rng = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export interface EntryInput {
  memberId: string | null;
  displayName: string;
  /** AB 방식에서 필수 */
  side?: Side;
}

/**
 * 참가자에게 한울 코드(순번)를 무작위 배정한다.
 * AB 방식은 A조/B조 각각의 코드 범위 안에서 따로 섞는다.
 */
export function assignCodes(
  method: MatchMethod,
  size: number,
  entries: EntryInput[],
  rng: Rng = Math.random,
): Participant[] {
  if (!isSupported(method, size)) {
    throw new Error(`${method === "HANUL_AA" ? "한울AA" : "한울AB"} 방식은 ${size}명을 지원하지 않습니다.`);
  }
  if (entries.length !== size) {
    throw new Error(`참가자가 ${entries.length}명입니다. ${size}명이 필요합니다.`);
  }
  const keys = entries.map((e) => e.memberId ?? `guest:${e.displayName.trim()}`);
  if (new Set(keys).size !== keys.length) {
    throw new Error("중복된 참가자가 있습니다.");
  }

  const codes = codesFor(method, size);
  if (method === "HANUL_AA") {
    const shuffled = shuffle(entries, rng);
    return codes.map(({ code }, i) => toParticipant(code, undefined, shuffled[i]));
  }

  const result: Participant[] = [];
  for (const side of ["A", "B"] as const) {
    const sideEntries = entries.filter((e) => e.side === side);
    const sideCodes = codes.filter((c) => c.side === side);
    if (sideEntries.length !== sideCodes.length) {
      throw new Error(`${side}그룹은 ${sideCodes.length}명이어야 합니다. (현재 ${sideEntries.length}명)`);
    }
    const shuffled = shuffle(sideEntries, rng);
    sideCodes.forEach(({ code }, i) => result.push(toParticipant(code, side, shuffled[i])));
  }
  return result;
}

function toParticipant(code: string, side: Side | undefined, e: EntryInput): Participant {
  const p: Participant = { code, memberId: e.memberId, displayName: e.displayName.trim() };
  if (side) p.side = side;
  return p;
}

/** 규칙표에 따라 전체 경기 목록(점수 미입력)을 만든다 */
export function generateMatches(method: MatchMethod, size: number): Match[] {
  return getSchedule(method, size).map((s) => ({
    order: s.order,
    teamA: s.teamA,
    teamB: s.teamB,
    scoreA: null,
    scoreB: null,
  }));
}

// 도메인 공통 타입 — DB(ObjectId)와 무관한 순수 타입. id는 문자열로 다룬다.

export type MatchMethod = "HANUL_AA" | "HANUL_AB";
export type Side = "A" | "B";
export type TournamentStatus = "IN_PROGRESS" | "COMPLETED";

export interface Participant {
  /** 한울 코드: AA는 1..9,A..G / AB는 A조 1..8, B조 A..H */
  code: string;
  /** AB 방식에서의 소속 조 */
  side?: Side;
  /** 회원 명부 연결. 게스트(직접 입력)는 null */
  memberId: string | null;
  displayName: string;
}

export interface Match {
  order: number;
  teamA: [string, string];
  teamB: [string, string];
  scoreA: number | null;
  scoreB: number | null;
}

export interface Awards {
  winners: [string, string];
  runnersUp: [string, string];
  /** 3위 (3·4위전 승리 팀). 선택 입력 */
  third?: [string, string];
}

export interface Group {
  id: string;
  tournamentId: string;
  name: string;
  order: number;
  method: MatchMethod;
  size: number;
  participants: Participant[];
  matches: Match[];
  awards?: Awards;
}

export interface Tournament {
  id: string;
  title: string;
  year: number;
  month: number;
  /** YYYY-MM-DD */
  date: string;
  status: TournamentStatus;
}

export interface Member {
  id: string;
  name: string;
  nickname?: string;
  isActive: boolean;
}

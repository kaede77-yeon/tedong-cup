import type { TournamentRecord } from "./memberStats";
import type { Participant } from "./types";

export interface Laureate {
  memberId: string | null;
  displayName: string;
}

export interface HallOfFameEntry {
  tournamentId: string;
  title: string;
  year: number;
  month: number;
  date: string;
  groups: {
    groupId: string;
    groupName: string;
    winners: Laureate[];
    runnersUp: Laureate[];
    /** 3위가 입력되지 않았으면 빈 배열 */
    third: Laureate[];
  }[];
}

function toLaureates(codes: string[], participants: Participant[]): Laureate[] {
  return codes
    .map((c) => participants.find((p) => p.code === c))
    .filter((p): p is Participant => !!p)
    .map((p) => ({ memberId: p.memberId, displayName: p.displayName }));
}

/** 명예의 전당: 종료된 대회의 그룹별 우승/준우승자. 최신순, 연도 필터 선택 */
export function buildHallOfFame(records: TournamentRecord[], year?: number): HallOfFameEntry[] {
  return records
    .filter((r) => r.tournament.status === "COMPLETED")
    .filter((r) => year === undefined || r.tournament.year === year)
    .sort((a, b) => b.tournament.date.localeCompare(a.tournament.date))
    .map(({ tournament: t, groups }) => ({
      tournamentId: t.id,
      title: t.title,
      year: t.year,
      month: t.month,
      date: t.date,
      groups: [...groups]
        .sort((a, b) => a.order - b.order)
        .filter((g) => g.awards)
        .map((g) => ({
          groupId: g.id,
          groupName: g.name,
          winners: toLaureates(g.awards!.winners, g.participants),
          runnersUp: toLaureates(g.awards!.runnersUp, g.participants),
          third: toLaureates(g.awards!.third ?? [], g.participants),
        })),
    }));
}

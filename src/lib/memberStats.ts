import { groupStandings } from "./standings";
import type { Group, Side, Tournament } from "./types";

export interface TournamentRecord {
  tournament: Tournament;
  groups: Group[];
}

export type AwardKind = "WINNER" | "RUNNER_UP" | "THIRD";

export interface MemberHistoryEntry {
  tournamentId: string;
  title: string;
  date: string;
  groupId: string;
  groupName: string;
  /** AB 방식이면 소속 조 (순위는 조 안에서의 순위) */
  side?: Side;
  rank: number;
  tied: boolean;
  /** 순위 비교 대상 인원 (AB 방식은 조 인원) */
  groupSize: number;
  played: number;
  wins: number;
  losses: number;
  diff: number;
  award: AwardKind | null;
}

export interface MemberStats {
  memberId: string;
  tournaments: number;
  played: number;
  wins: number;
  losses: number;
  /** 0~100, 소수 첫째 자리. 경기가 없으면 0 */
  winRate: number;
  pointsFor: number;
  pointsAgainst: number;
  diff: number;
  titles: number;
  runnerUps: number;
  thirds: number;
  /** 최신 대회 순 */
  history: MemberHistoryEntry[];
}

function emptyStats(memberId: string): MemberStats {
  return {
    memberId,
    tournaments: 0,
    played: 0,
    wins: 0,
    losses: 0,
    winRate: 0,
    pointsFor: 0,
    pointsAgainst: 0,
    diff: 0,
    titles: 0,
    runnerUps: 0,
    thirds: 0,
    history: [],
  };
}

export function winRate(wins: number, played: number): number {
  return played > 0 ? Math.round((wins / played) * 1000) / 10 : 0;
}

/**
 * 종료(COMPLETED)된 대회 기록으로 회원별 누적 통계를 계산한다.
 * 게스트(memberId=null)는 제외한다. 상태 필터링은 호출부 책임이 아니라 여기서 한 번 더 보장한다.
 */
export function computeMemberStats(records: TournamentRecord[]): Map<string, MemberStats> {
  const stats = new Map<string, MemberStats>();
  const sorted = [...records].sort((a, b) => b.tournament.date.localeCompare(a.tournament.date));

  for (const { tournament, groups } of sorted) {
    if (tournament.status !== "COMPLETED") continue;
    const seenInTournament = new Set<string>();

    for (const g of groups) {
      for (const { side, rows } of groupStandings(g)) {
        for (const row of rows) {
          if (!row.memberId) continue;
          const s = stats.get(row.memberId) ?? emptyStats(row.memberId);
          stats.set(row.memberId, s);

          const award: AwardKind | null = g.awards?.winners.includes(row.code)
            ? "WINNER"
            : g.awards?.runnersUp.includes(row.code)
              ? "RUNNER_UP"
              : g.awards?.third?.includes(row.code)
                ? "THIRD"
                : null;

          if (!seenInTournament.has(row.memberId)) {
            seenInTournament.add(row.memberId);
            s.tournaments++;
          }
          s.played += row.played;
          s.wins += row.wins;
          s.losses += row.losses;
          s.pointsFor += row.pointsFor;
          s.pointsAgainst += row.pointsAgainst;
          if (award === "WINNER") s.titles++;
          if (award === "RUNNER_UP") s.runnerUps++;
          if (award === "THIRD") s.thirds++;
          s.history.push({
            tournamentId: tournament.id,
            title: tournament.title,
            date: tournament.date,
            groupId: g.id,
            groupName: g.name,
            ...(side ? { side } : {}),
            rank: row.rank,
            tied: row.tied,
            groupSize: rows.length,
            played: row.played,
            wins: row.wins,
            losses: row.losses,
            diff: row.diff,
            award,
          });
        }
      }
    }
  }

  for (const s of stats.values()) {
    s.diff = s.pointsFor - s.pointsAgainst;
    s.winRate = winRate(s.wins, s.played);
  }
  return stats;
}

/** 통계 랭킹 정렬: 우승 → 승률 → 승수 → 득실차 */
type RankKeys = Pick<MemberStats, "titles" | "winRate" | "wins" | "diff">;
export function compareMemberStats(a: RankKeys, b: RankKeys): number {
  return b.titles - a.titles || b.winRate - a.winRate || b.wins - a.wins || b.diff - a.diff;
}

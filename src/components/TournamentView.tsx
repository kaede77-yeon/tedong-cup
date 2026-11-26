"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/client";
import type { Match } from "@/lib/types";
import type { GroupView, TournamentDetail } from "@/server/repo";
import { ScoreSheet } from "./ScoreSheet";
import { formatDate, rankLabel, StatusBadge } from "./ui";

const POLL_MS = 10_000;

interface Props {
  initial: TournamentDetail;
  /** 관리자 모드: 경기 탭 시 점수 입력 */
  admin?: boolean;
  /** 관리자 화면에서 그룹 관련 추가 액션 렌더링 */
  groupActions?: (g: GroupView, refresh: () => void) => React.ReactNode;
  showHeader?: boolean;
}

export function TournamentView({ initial, admin = false, groupActions, showHeader = true }: Props) {
  const id = initial.tournament.id;
  const { data, mutate } = useSWR<TournamentDetail>(`/api/tournaments/${id}`, fetcher, {
    fallbackData: initial,
    // 함수형 refreshInterval은 마운트 시 캐시(fallbackData 미포함)로 평가되어 0이 되므로 숫자로 고정한다
    refreshInterval: initial.tournament.status === "IN_PROGRESS" ? POLL_MS : 0,
    revalidateOnFocus: true,
  });
  const detail = data ?? initial;
  const { tournament, groups } = detail;

  const [groupIdx, setGroupIdx] = useState(0);
  const [tab, setTab] = useState<"matches" | "standings">("matches");
  const [focus, setFocus] = useState<string | null>(null); // 하이라이트할 참가자 code
  const [editing, setEditing] = useState<Match | null>(null);

  const group = groups[Math.min(groupIdx, groups.length - 1)];
  const editable = admin && tournament.status === "IN_PROGRESS";

  return (
    <div>
      {showHeader && (
        <div className="px-4 pt-5 pb-3">
          <div className="flex items-center gap-2">
            <StatusBadge status={tournament.status} />
            <span className="text-sm font-semibold text-muted">{formatDate(tournament.date)}</span>
          </div>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight">{tournament.title}</h1>
        </div>
      )}

      {groups.length === 0 ? (
        <p className="px-4 py-12 text-center font-medium text-muted">아직 생성된 그룹이 없습니다.</p>
      ) : (
        <>
          {/* 그룹 탭 */}
          {groups.length > 1 && (
            <div className="flex gap-2 overflow-x-auto px-4 pb-2" role="tablist" aria-label="그룹">
              {groups.map((g, i) => (
                <button
                  key={g.id}
                  role="tab"
                  aria-selected={i === groupIdx}
                  onClick={() => {
                    setGroupIdx(i);
                    setFocus(null);
                  }}
                  className={`min-h-11 shrink-0 rounded-full border-2 px-4 text-base font-bold ${
                    i === groupIdx ? "border-court bg-court text-white" : "border-ink/15 bg-white text-ink"
                  }`}
                >
                  {g.name}
                </button>
              ))}
            </div>
          )}

          <div className="sticky top-14 z-20 border-b-2 border-ink/10 bg-white px-4 pt-1">
            <div className="flex items-baseline justify-between">
              <p className="text-sm font-semibold text-muted">
                {group.name} · {group.method === "HANUL_AA" ? "한울AA" : "한울AB"} {group.size}명
              </p>
              <p className="tabular text-sm font-bold text-court">
                {group.playedCount}/{group.matches.length} 경기 완료
              </p>
            </div>
            {/* 대진표/순위표 탭 */}
            <div className="mt-2 grid grid-cols-2" role="tablist">
              {(
                [
                  ["matches", "대진표"],
                  ["standings", "순위표"],
                ] as const
              ).map(([k, label]) => (
                <button
                  key={k}
                  role="tab"
                  aria-selected={tab === k}
                  onClick={() => setTab(k)}
                  className={`h-12 border-b-4 text-lg font-extrabold ${
                    tab === k ? "border-court text-ink" : "border-transparent text-muted"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {focus && <FocusBar group={group} code={focus} onClear={() => setFocus(null)} />}

          {tab === "matches" ? (
            <MatchList group={group} focus={focus} onFocus={setFocus} onEdit={editable ? setEditing : undefined} />
          ) : (
            <StandingsTable
              group={group}
              focus={focus}
              onFocus={(c) => {
                setFocus(c);
                setTab("matches");
              }}
            />
          )}

          {groupActions && <div className="px-4 pt-4">{groupActions(group, () => mutate())}</div>}
        </>
      )}

      {editing && group && (
        <ScoreSheet
          group={group}
          match={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            mutate();
          }}
        />
      )}
    </div>
  );
}

function useNames(group: GroupView) {
  return useMemo(() => new Map(group.participants.map((p) => [p.code, p.displayName])), [group]);
}

function FocusBar({ group, code, onClear }: { group: GroupView; code: string; onClear: () => void }) {
  const name = useNames(group).get(code);
  const mine = group.matches.filter((m) => [...m.teamA, ...m.teamB].includes(code)).map((m) => m.order);
  return (
    <div className="flex items-center justify-between gap-2 bg-ball px-4 py-2">
      <p className="text-sm font-bold">
        <span className="text-base font-extrabold">{name}</span> 경기: {mine.map((o) => `${o}번`).join(", ")}
      </p>
      <button onClick={onClear} className="min-h-11 rounded-lg bg-ink px-3 text-sm font-bold text-white">
        해제
      </button>
    </div>
  );
}

function MatchList({
  group,
  focus,
  onFocus,
  onEdit,
}: {
  group: GroupView;
  focus: string | null;
  onFocus: (code: string) => void;
  onEdit?: (m: Match) => void;
}) {
  const names = useNames(group);
  // 다음에 진행할 경기 = 미입력 경기 중 가장 앞 순서
  const next = group.matches.find((m) => m.scoreA === null)?.order;

  return (
    <ol className="space-y-2 px-3 py-3">
      {group.matches.map((m) => {
        const involved = focus !== null && [...m.teamA, ...m.teamB].includes(focus);
        const dim = focus !== null && !involved;
        const played = m.scoreA !== null && m.scoreB !== null;
        const aWin = played && m.scoreA! > m.scoreB!;
        const bWin = played && m.scoreB! > m.scoreA!;

        const team = (codes: [string, string], win: boolean, align: "left" | "right") => (
          <div className={`flex min-w-0 flex-1 flex-col gap-1 ${align === "right" ? "items-end text-right" : ""}`}>
            {codes.map((c) => (
              <button
                key={c}
                onClick={(e) => {
                  e.stopPropagation();
                  onFocus(c);
                }}
                className={`max-w-full truncate rounded-md px-1.5 py-0.5 text-[17px] leading-tight ${
                  win ? "font-extrabold" : played ? "font-medium text-muted" : "font-bold"
                } ${focus === c ? "bg-ball text-ink" : ""}`}
              >
                {names.get(c)}
              </button>
            ))}
          </div>
        );

        const body = (
          <>
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-muted">게임 {m.order}</span>
              {m.order === next && !played && (
                <span className="rounded bg-court px-1.5 text-[11px] font-extrabold text-white">다음 경기</span>
              )}
            </div>
            <div className="mt-1 flex items-center gap-2">
              {team(m.teamA, aWin, "left")}
              <div className="tabular flex w-[88px] shrink-0 items-center justify-center gap-1 text-3xl font-black">
                {played ? (
                  <>
                    <span className={aWin ? "text-court" : "text-gray-400"}>{m.scoreA}</span>
                    <span className="text-xl text-gray-300">:</span>
                    <span className={bWin ? "text-court" : "text-gray-400"}>{m.scoreB}</span>
                  </>
                ) : (
                  <span className="text-lg font-bold text-gray-300">vs</span>
                )}
              </div>
              {team(m.teamB, bWin, "right")}
            </div>
          </>
        );

        const cls = `block w-full rounded-2xl border-2 p-3 text-left transition-opacity ${
          involved ? "border-ink bg-ball/30" : m.order === next ? "border-court" : "border-ink/10"
        } ${dim ? "opacity-35" : ""}`;

        return (
          <li key={m.order}>
            {onEdit ? (
              <div
                role="button"
                tabIndex={0}
                onClick={() => onEdit(m)}
                onKeyDown={(e) => e.key === "Enter" && onEdit(m)}
                className={`${cls} cursor-pointer active:bg-gray-50`}
                aria-label={`게임 ${m.order} 점수 입력`}
              >
                {body}
              </div>
            ) : (
              <div className={cls}>{body}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

function StandingsTable({
  group,
  focus,
  onFocus,
}: {
  group: GroupView;
  focus: string | null;
  onFocus: (code: string) => void;
}) {
  const medal = (code: string) =>
    group.awards?.winners.includes(code)
      ? "🥇"
      : group.awards?.runnersUp.includes(code)
        ? "🥈"
        : group.awards?.third?.includes(code)
          ? "🥉"
          : "";

  // 한울AB는 A그룹·B그룹 각각 따로 순위 (서버에서 groupStandings로 계산)
  const tables = group.standings;

  return (
    <div className="px-2 py-3">
      {tables.map(({ side, rows }) => (
        <section key={side ?? "all"} className={side === "B" ? "mt-6" : ""}>
          {side && (
            <h3 className="flex items-baseline justify-between px-2 pb-1">
              <span className="text-lg font-extrabold">{side}그룹 순위</span>
              <span className="text-xs font-semibold text-muted">{rows.length}명 · 조 안에서 순위 비교</span>
            </h3>
          )}
          <table className="tabular w-full border-collapse text-center text-[15px]">
            <thead>
              <tr className="border-b-2 border-ink text-xs font-extrabold text-muted">
                <th className="w-11 py-2">순위</th>
                <th className="py-2 text-left">이름</th>
                <th className="w-8">경기</th>
                <th className="w-8">승</th>
                <th className="w-8">패</th>
                <th className="w-8">득</th>
                <th className="w-8">실</th>
                <th className="w-10">득실</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.code}
                  className={`border-b border-ink/10 ${focus === r.code ? "bg-ball" : r.rank <= 2 && r.played > 0 ? "bg-court-light" : ""}`}
                >
                  <td className="py-3 font-black">
                    <span className={r.tied ? "text-xs" : "text-lg"}>{rankLabel(r.rank, r.tied)}</span>
                  </td>
                  <td className="max-w-0 py-1 text-left">
                    <button
                      onClick={() => onFocus(r.code)}
                      className="block w-full truncate text-left text-base font-bold"
                    >
                      {medal(r.code)}
                      {r.displayName}
                    </button>
                  </td>
                  <td>{r.played}</td>
                  <td className="font-extrabold">{r.wins}</td>
                  <td>{r.losses}</td>
                  <td>{r.pointsFor}</td>
                  <td>{r.pointsAgainst}</td>
                  <td className={`font-bold ${r.diff > 0 ? "text-court" : r.diff < 0 ? "text-red-700" : ""}`}>
                    {r.diff > 0 ? `+${r.diff}` : r.diff}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
      <p className="mt-3 px-2 text-xs font-medium text-muted">
        순위 기준: 승수 → 득실차 → 다득점. 모두 같으면 공동 순위. 이름을 누르면 해당 선수의 경기를 표시합니다.
      </p>
      {group.participants.some((p) => p.memberId) && (
        <p className="mt-1 px-2 text-xs font-medium text-muted">
          <Link href="/members" className="underline">
            개인 누적 통계 보기
          </Link>
        </p>
      )}
    </div>
  );
}

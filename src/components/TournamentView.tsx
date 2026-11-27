"use client";

import { X } from "lucide-react";
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
  const progress = group ? Math.round((group.playedCount / group.matches.length) * 100) : 0;

  return (
    <div>
      {showHeader && (
        <div className="px-4 pt-6 pb-4">
          <div className="flex items-center gap-2">
            <StatusBadge status={tournament.status} />
            <span className="text-sm text-muted">{formatDate(tournament.date)}</span>
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">{tournament.title}</h1>
        </div>
      )}

      {groups.length === 0 ? (
        <p className="px-4 py-20 text-center text-sm text-muted">아직 생성된 그룹이 없습니다.</p>
      ) : (
        <>
          {/* 그룹 선택 */}
          {groups.length > 1 && (
            <div className="flex gap-2 overflow-x-auto px-4 pb-3" role="tablist" aria-label="그룹">
              {groups.map((g, i) => (
                <button
                  key={g.id}
                  role="tab"
                  aria-selected={i === groupIdx}
                  onClick={() => {
                    setGroupIdx(i);
                    setFocus(null);
                  }}
                  className={`chip shrink-0 ${i === groupIdx ? "chip-on" : ""}`}
                >
                  {g.name}
                </button>
              ))}
            </div>
          )}

          <div className="sticky top-14 z-20 border-b border-line bg-bg/85 px-4 pt-1 pb-3 backdrop-blur-md">
            <div className="flex items-center justify-between text-xs text-muted">
              <span>
                {group.name} · {group.method === "HANUL_AA" ? "한울AA" : "한울AB"} {group.size}명
              </span>
              <span className="tabular font-medium text-ink">
                {group.playedCount}/{group.matches.length} 경기
              </span>
            </div>
            <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-subtle" aria-hidden>
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
            </div>
            {/* 대진표/순위표 세그먼트 */}
            <div className="mt-3 grid grid-cols-2 rounded-tab bg-subtle p-1" role="tablist">
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
                  className={`h-10 rounded-tab-item text-sm font-semibold transition ${
                    tab === k ? "bg-tab-on text-tab-on-fg shadow-sm" : "text-muted hover:text-ink"
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

          {groupActions && <div className="px-4 pt-2">{groupActions(group, () => mutate())}</div>}
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
    <div className="mx-4 mt-3 flex items-center justify-between gap-2 rounded-box bg-highlight px-3.5 py-2">
      <p className="text-sm">
        <span className="font-semibold">{name}</span>
        <span className="text-muted"> · {mine.map((o) => `${o}번`).join(", ")} 경기</span>
      </p>
      <button
        onClick={onClear}
        className="grid size-9 place-items-center rounded-lg text-muted transition hover:bg-surface hover:text-ink"
        aria-label="강조 해제"
      >
        <X className="size-4" />
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
    <ol className="space-y-3 px-4 py-4">
      {group.matches.map((m) => {
        const involved = focus !== null && [...m.teamA, ...m.teamB].includes(focus);
        const dim = focus !== null && !involved;
        const played = m.scoreA !== null && m.scoreB !== null;
        const aWin = played && m.scoreA! > m.scoreB!;
        const bWin = played && m.scoreB! > m.scoreA!;
        const isNext = m.order === next && !played;

        const team = (codes: [string, string], win: boolean, align: "left" | "right") => (
          <div className={`flex min-w-0 flex-1 flex-col ${align === "right" ? "items-end text-right" : "items-start"}`}>
            {codes.map((c) => (
              <button
                key={c}
                onClick={(e) => {
                  e.stopPropagation();
                  onFocus(c);
                }}
                className={`max-w-full truncate rounded-md px-1.5 text-[18px] leading-tight transition ${
                  win ? "font-semibold text-ink" : played ? "text-muted" : "font-medium text-ink"
                } ${focus === c ? "bg-highlight" : "hover:bg-subtle"}`}
              >
                {names.get(c)}
              </button>
            ))}
          </div>
        );

        const body = (
          <>
            <div className="flex items-center justify-between">
              <span className="tabular rounded-full border border-primary/20 bg-primary-soft px-2.5 text-xs leading-[18px] font-semibold text-primary-text">
                게임 {m.order}
              </span>
              {isNext && (
                <span className="rounded-full bg-primary px-2 text-[13px] leading-[18px] font-semibold text-primary-fg">
                  다음 경기
                </span>
              )}
            </div>
            <div className="mt-1 flex items-center gap-2">
              {team(m.teamA, aWin, "left")}
              <div className="tabular flex w-[84px] shrink-0 items-center justify-center gap-1.5 text-[32px] leading-none font-bold">
                {played ? (
                  <>
                    <span className={aWin ? "text-primary-text" : "text-faint"}>{m.scoreA}</span>
                    <span className="text-base text-faint">:</span>
                    <span className={bWin ? "text-primary-text" : "text-faint"}>{m.scoreB}</span>
                  </>
                ) : (
                  <span className="text-sm font-medium text-faint">vs</span>
                )}
              </div>
              {team(m.teamB, bWin, "right")}
            </div>
          </>
        );

        const cls = `block w-full rounded-card border bg-surface px-4 py-2 text-left shadow-xs transition ${
          involved ? "border-primary ring-4 ring-primary/10" : isNext ? "border-primary/40" : "border-line"
        } ${dim ? "opacity-40" : ""}`;

        return (
          <li key={m.order}>
            {onEdit ? (
              <div
                role="button"
                tabIndex={0}
                onClick={() => onEdit(m)}
                onKeyDown={(e) => e.key === "Enter" && onEdit(m)}
                className={`${cls} cursor-pointer hover:border-line-strong active:scale-[0.99]`}
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
    <div className="space-y-5 px-4 py-4">
      {tables.map(({ side, rows }) => (
        <section key={side ?? "all"}>
          {side && (
            <div className="flex items-baseline justify-between px-1 pb-2">
              <h3 className="text-base font-semibold">{side}그룹 순위</h3>
              <span className="text-xs text-muted">{rows.length}명 · 조 안에서 순위 비교</span>
            </div>
          )}
          <div className="overflow-hidden rounded-card border border-line bg-surface shadow-xs">
            <table className="tabular w-full border-collapse text-center text-[16px]">
              <thead>
                <tr className="border-b border-line bg-subtle/60 text-[13px] font-medium text-muted">
                  <th className="w-12 py-2.5">순위</th>
                  <th className="py-2.5 text-left">이름</th>
                  <th className="w-8">경기</th>
                  <th className="w-8">승</th>
                  <th className="w-8">패</th>
                  <th className="w-8">득</th>
                  <th className="w-8">실</th>
                  <th className="w-11 pr-2">득실</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((r) => {
                  const top = r.rank <= 2 && r.played > 0;
                  return (
                    <tr key={r.code} className={focus === r.code ? "bg-highlight" : top ? "bg-primary-soft/60" : ""}>
                      <td className="py-3">
                        <span
                          className={`inline-grid min-w-7 place-items-center rounded-md px-1 font-semibold ${
                            r.tied ? "text-[13px]" : "text-[17px]"
                          } ${top ? "text-primary-text" : "text-ink"}`}
                        >
                          {rankLabel(r.rank, r.tied)}
                        </span>
                      </td>
                      <td className="max-w-0 text-left">
                        <button onClick={() => onFocus(r.code)} className="flex w-full items-center py-1 text-left text-[17px] font-medium">
                          {/* 이름이 길어 잘려도 메달은 항상 보이도록 이름만 truncate */}
                          <span className="truncate">{r.displayName}</span>
                          {medal(r.code) && <span className="ml-1 shrink-0">{medal(r.code)}</span>}
                        </button>
                      </td>
                      <td className="text-muted">{r.played}</td>
                      <td className="font-semibold">{r.wins}</td>
                      <td className="text-muted">{r.losses}</td>
                      <td className="text-muted">{r.pointsFor}</td>
                      <td className="text-muted">{r.pointsAgainst}</td>
                      <td className={`pr-2 font-semibold ${r.diff > 0 ? "text-success" : r.diff < 0 ? "text-danger" : "text-muted"}`}>
                        {r.diff > 0 ? `+${r.diff}` : r.diff}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ))}
      <div className="space-y-1 px-1 text-xs text-muted">
        <p>순위 기준: 승수 → 득실차 → 다득점, 모두 같으면 공동 순위</p>
        <p>이름을 누르면 해당 선수의 경기를 표시합니다.</p>
        {group.participants.some((p) => p.memberId) && (
          <p>
            <Link href="/members" className="font-medium text-primary-text underline-offset-4 hover:underline">
              개인 누적 통계 보기 →
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { api } from "@/lib/client";
import type { Match } from "@/lib/types";
import type { GroupView } from "@/server/repo";
import { Button } from "./ui";

/**
 * 점수 입력 바텀시트.
 * 1) 이긴 팀을 탭 → 6 자동 입력  2) 진 팀 점수 0~5 탭  3) 확인 문구 보고 저장
 */
export function ScoreSheet({
  group,
  match,
  onClose,
  onSaved,
}: {
  group: GroupView;
  match: Match;
  onClose: () => void;
  onSaved: () => void;
}) {
  const names = new Map(group.participants.map((p) => [p.code, p.displayName]));
  const initWinner = match.scoreA === null ? null : match.scoreA! > match.scoreB! ? "A" : "B";
  const [winner, setWinner] = useState<"A" | "B" | null>(initWinner);
  const [loserScore, setLoserScore] = useState<number | null>(
    match.scoreA === null ? null : Math.min(match.scoreA!, match.scoreB!),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const teamName = (t: [string, string]) => t.map((c) => names.get(c)).join(" · ");
  const scoreA = winner === "A" ? 6 : loserScore;
  const scoreB = winner === "B" ? 6 : loserScore;
  const ready = winner !== null && loserScore !== null;

  async function save(body: { scoreA: number; scoreB: number } | null) {
    setBusy(true);
    setError(null);
    try {
      await api(`/api/groups/${group.id}/matches/${match.order}`, "PATCH", body);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장 실패");
      setBusy(false);
    }
  }

  const teamButton = (side: "A" | "B", team: [string, string]) => {
    const selected = winner === side;
    return (
      <button
        key={side}
        onClick={() => setWinner(side)}
        className={`flex min-h-20 w-full items-center justify-between gap-2 rounded-2xl border-4 px-4 text-left ${
          selected ? "border-court bg-court-light" : "border-ink/15"
        }`}
        aria-pressed={selected}
      >
        <span className="text-lg font-extrabold leading-snug">{teamName(team)}</span>
        <span className={`tabular text-4xl font-black ${selected ? "text-court" : "text-gray-300"}`}>
          {winner === null ? "-" : selected ? 6 : (loserScore ?? "?")}
        </span>
      </button>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`게임 ${match.order} 점수 입력`}
        className="w-full max-w-[480px] rounded-t-3xl bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-gray-300" />
        <h2 className="text-xl font-extrabold">
          {group.name} · 게임 {match.order}
        </h2>

        <p className="mt-3 text-sm font-bold text-muted">① 이긴 팀을 누르세요 (6점)</p>
        <div className="mt-2 space-y-2">
          {teamButton("A", match.teamA)}
          {teamButton("B", match.teamB)}
        </div>

        <p className="mt-4 text-sm font-bold text-muted">② 진 팀 점수</p>
        <div className="mt-2 grid grid-cols-6 gap-2">
          {[0, 1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              disabled={winner === null}
              onClick={() => setLoserScore(n)}
              className={`tabular h-14 rounded-xl border-2 text-2xl font-black disabled:opacity-30 ${
                loserScore === n ? "border-court bg-court text-white" : "border-ink/15 bg-white"
              }`}
            >
              {n}
            </button>
          ))}
        </div>

        {ready && (
          <p className="mt-4 rounded-xl bg-ball px-3 py-2 text-center text-base font-extrabold">
            {teamName(match.teamA)} <span className="tabular text-xl">{scoreA} : {scoreB}</span> {teamName(match.teamB)}
          </p>
        )}
        {error && <p className="mt-3 text-center font-bold text-red-700">{error}</p>}

        <div className="mt-4 grid grid-cols-[auto_1fr] gap-2">
          {match.scoreA !== null ? (
            <Button variant="secondary" disabled={busy} onClick={() => confirm("이 경기의 점수를 지울까요?") && save(null)}>
              점수 지우기
            </Button>
          ) : (
            <Button variant="secondary" onClick={onClose}>
              취소
            </Button>
          )}
          <Button disabled={!ready || busy} onClick={() => save({ scoreA: scoreA!, scoreB: scoreB! })}>
            {busy ? "저장 중…" : "저장"}
          </Button>
        </div>
      </div>
    </div>
  );
}

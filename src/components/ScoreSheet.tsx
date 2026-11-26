"use client";

import { useState } from "react";
import { api } from "@/lib/client";
import type { Match } from "@/lib/types";
import type { GroupView } from "@/server/repo";
import { Sheet, StepLabel } from "./Sheet";
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
        className={`flex min-h-[72px] w-full items-center justify-between gap-3 rounded-2xl border px-4 text-left shadow-xs transition active:scale-[0.99] ${
          selected
            ? "border-primary bg-primary-soft ring-4 ring-primary/10"
            : "border-line-strong bg-surface hover:bg-subtle"
        }`}
        aria-pressed={selected}
      >
        <span className="text-base leading-snug font-semibold">{teamName(team)}</span>
        <span className={`tabular text-3xl font-bold ${selected ? "text-primary-text" : "text-faint"}`}>
          {winner === null ? "–" : selected ? 6 : (loserScore ?? "?")}
        </span>
      </button>
    );
  };

  return (
    <Sheet
      label={`게임 ${match.order} 점수 입력`}
      title={`게임 ${match.order}`}
      description={group.name}
      onClose={onClose}
      footer={
        <div className="grid grid-cols-[auto_1fr] gap-2">
          {match.scoreA !== null ? (
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => confirm("이 경기의 점수를 지울까요?") && save(null)}
            >
              점수 지우기
            </Button>
          ) : (
            <Button variant="secondary" onClick={onClose}>
              취소
            </Button>
          )}
          <Button disabled={!ready || busy} onClick={() => save({ scoreA: scoreA!, scoreB: scoreB! })}>
            {busy ? "저장 중…" : ready ? `${scoreA} : ${scoreB} 저장` : "저장"}
          </Button>
        </div>
      }
    >
      <StepLabel n={1}>이긴 팀을 선택하세요 (6점)</StepLabel>
      <div className="space-y-2">
        {teamButton("A", match.teamA)}
        {teamButton("B", match.teamB)}
      </div>

      <div className="mt-5">
        <StepLabel n={2}>진 팀 점수</StepLabel>
        <div className="grid grid-cols-6 gap-2">
          {[0, 1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              disabled={winner === null}
              onClick={() => setLoserScore(n)}
              className={`tabular h-12 rounded-xl border text-xl font-semibold shadow-xs transition active:scale-95 disabled:opacity-30 ${
                loserScore === n
                  ? "border-primary bg-primary text-primary-fg shadow-primary/25"
                  : "border-line-strong bg-surface hover:bg-subtle"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {ready && (
        <p className="mt-5 rounded-xl bg-subtle px-3 py-2.5 text-center text-sm">
          <span className={winner === "A" ? "font-semibold" : "text-muted"}>{teamName(match.teamA)}</span>
          <span className="tabular mx-2 text-base font-bold text-primary-text">
            {scoreA} : {scoreB}
          </span>
          <span className={winner === "B" ? "font-semibold" : "text-muted"}>{teamName(match.teamB)}</span>
        </p>
      )}
      {error && <p className="mt-3 text-center text-sm font-medium text-danger">{error}</p>}
    </Sheet>
  );
}

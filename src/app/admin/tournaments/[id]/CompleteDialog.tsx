"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { api } from "@/lib/client";
import type { TournamentDetail } from "@/server/repo";

type Place = "winners" | "runnersUp" | "third";
type AwardPick = Record<Place, string[]>;

const PLACES: { key: Place; icon: string; label: string; required: boolean }[] = [
  { key: "winners", icon: "🥇", label: "우승", required: true },
  { key: "runnersUp", icon: "🥈", label: "준우승", required: true },
  { key: "third", icon: "🥉", label: "3위", required: false },
];

const empty = (): AwardPick => ({ winners: [], runnersUp: [], third: [] });

/**
 * 대회 종료: 그룹별 우승 2명·준우승 2명(필수), 3위 2명(선택) 확정.
 * 리그 순위와 별도로 결정전(토너먼트)을 거쳐 수상자가 정해지므로 자동 입력하지 않는다.
 * (잠금 해제 후 재종료 시에는 이전에 확정했던 수상자를 불러온다)
 */
export function CompleteDialog({ detail, onClose, onDone }: { detail: TournamentDetail; onClose: () => void; onDone: () => void }) {
  const [picks, setPicks] = useState<Record<string, AwardPick>>(() =>
    Object.fromEntries(
      detail.groups.map((g) => [
        g.id,
        g.awards ? { winners: g.awards.winners, runnersUp: g.awards.runnersUp, third: g.awards.third ?? [] } : empty(),
      ]),
    ),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unplayed = detail.groups.reduce((n, g) => n + g.matches.length - g.playedCount, 0);
  const valid = detail.groups.every((g) => {
    const p = picks[g.id];
    return p.winners.length === 2 && p.runnersUp.length === 2 && (p.third.length === 0 || p.third.length === 2);
  });

  /** 참가자 탭: 해제 → 우승 → 준우승 → 3위 → 해제 순환 (정원이 찬 자리는 건너뜀) */
  function cycle(groupId: string, code: string) {
    setPicks((prev) => {
      const p = prev[groupId];
      const current = PLACES.findIndex((pl) => p[pl.key].includes(code));
      const next: AwardPick = {
        winners: p.winners.filter((c) => c !== code),
        runnersUp: p.runnersUp.filter((c) => c !== code),
        third: p.third.filter((c) => c !== code),
      };
      for (let i = current + 1; i < PLACES.length; i++) {
        const key = PLACES[i].key;
        if (next[key].length < 2) {
          next[key] = [...next[key], code];
          break;
        }
      }
      return { ...prev, [groupId]: next };
    });
  }

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const awards = Object.fromEntries(
        Object.entries(picks).map(([id, p]) => [
          id,
          { winners: p.winners, runnersUp: p.runnersUp, ...(p.third.length === 2 ? { third: p.third } : {}) },
        ]),
      );
      await api(`/api/tournaments/${detail.tournament.id}/complete`, "POST", { awards });
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "종료 실패");
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="대회 종료"
        className="max-h-[92dvh] w-full max-w-[480px] overflow-y-auto rounded-t-3xl bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-extrabold">🏁 대회 종료 · 수상자 확정</h2>
        <p className="mt-1 text-sm font-medium text-muted">
          이름을 누를 때마다 <b>🥇우승 → 🥈준우승 → 🥉3위 → 해제</b> 순으로 바뀝니다.
          <br />
          그룹마다 우승 2명·준우승 2명은 필수, 3위 2명은 선택입니다.
        </p>
        {unplayed > 0 && (
          <p className="mt-2 rounded-lg bg-amber-100 px-3 py-2 text-sm font-bold text-amber-900">
            ⚠️ 점수가 입력되지 않은 경기가 {unplayed}개 있습니다. 그대로 종료할 수 있습니다.
          </p>
        )}

        {detail.groups.map((g) => {
          const p = picks[g.id];
          const people = [...g.participants].sort((a, b) => a.displayName.localeCompare(b.displayName, "ko"));
          return (
            <section key={g.id} className="mt-4">
              <div className="flex items-baseline justify-between">
                <span className="text-lg font-extrabold">{g.name}</span>
                <span className="text-sm font-bold text-muted">
                  {PLACES.map((pl) => `${pl.icon} ${p[pl.key].length}/2${pl.required ? "" : "(선택)"}`).join(" · ")}
                </span>
              </div>
              <ul className="mt-2 grid grid-cols-2 gap-2">
                {people.map((person) => {
                  const place = PLACES.find((pl) => p[pl.key].includes(person.code));
                  const style =
                    place?.key === "winners"
                      ? "border-amber-500 bg-amber-100"
                      : place?.key === "runnersUp"
                        ? "border-gray-500 bg-gray-100"
                        : place?.key === "third"
                          ? "border-orange-700 bg-orange-50"
                          : "border-ink/15";
                  return (
                    <li key={person.code}>
                      <button
                        onClick={() => cycle(g.id, person.code)}
                        className={`flex min-h-14 w-full items-center gap-2 rounded-xl border-2 px-3 text-left ${style}`}
                        aria-label={`${person.displayName} ${place ? place.label : "선택 안 함"}`}
                      >
                        <span className="w-7 shrink-0 text-lg">{place?.icon ?? ""}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-extrabold">{person.displayName}</span>
                          <span className="text-xs font-semibold text-muted">{place?.label ?? " "}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              {p.third.length === 1 && (
                <p className="mt-1 text-sm font-bold text-red-700">3위는 2명을 선택하거나 비워 두세요.</p>
              )}
            </section>
          );
        })}

        {error && <p className="mt-3 font-bold text-red-700">{error}</p>}
        <div className="mt-5 grid grid-cols-[auto_1fr] gap-2">
          <Button variant="secondary" onClick={onClose}>
            취소
          </Button>
          <Button disabled={!valid || busy} onClick={submit}>
            {busy ? "처리 중…" : "확정하고 대회 종료"}
          </Button>
        </div>
      </div>
    </div>
  );
}

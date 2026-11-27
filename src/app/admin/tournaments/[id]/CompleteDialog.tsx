"use client";

import { useState } from "react";
import { AlertTriangle, ListOrdered } from "lucide-react";
import { Sheet } from "@/components/Sheet";
import { Button, Notice } from "@/components/ui";
import { awardsFromStandings, type AwardPlace } from "@/lib/awardsFromStandings";
import { api } from "@/lib/client";
import type { TournamentDetail } from "@/server/repo";

type Place = AwardPlace;
type AwardPick = Record<Place, string[]>;

const PLACES: { key: Place; icon: string; label: string; required: boolean }[] = [
  { key: "winners", icon: "🥇", label: "우승", required: true },
  { key: "runnersUp", icon: "🥈", label: "준우승", required: true },
  { key: "third", icon: "🥉", label: "3위", required: false },
];

const empty = (): AwardPick => ({ winners: [], runnersUp: [], third: [] });

/**
 * 대회 종료: 그룹별 우승 2명·준우승 2명(필수), 3위 2명(선택) 확정.
 * 기본은 관리자가 직접 선택(결정전 결과 입력). 원하면 "순위표대로 채우기"로 리그 순위 기준 후보를 채운 뒤
 * 확인·수정해서 확정할 수 있다 (자동 확정은 하지 않음).
 * (잠금 해제 후 재종료 시에는 이전에 확정했던 수상자를 불러온다)
 */
export function CompleteDialog({
  detail,
  onClose,
  onDone,
}: {
  detail: TournamentDetail;
  onClose: () => void;
  onDone: () => void;
}) {
  const [picks, setPicks] = useState<Record<string, AwardPick>>(() =>
    Object.fromEntries(
      detail.groups.map((g) => [
        g.id,
        g.awards ? { winners: g.awards.winners, runnersUp: g.awards.runnersUp, third: g.awards.third ?? [] } : empty(),
      ]),
    ),
  );
  /** 순위표대로 채웠을 때 공동 순위 때문에 정하지 못한 자리 (그룹별) */
  const [unresolved, setUnresolved] = useState<Record<string, Place[]> | null>(null);
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

  /** 모든 그룹을 리그 순위표 기준으로 채운다 (정할 수 없는 자리는 비움) */
  function fillFromStandings() {
    const next: Record<string, AwardPick> = {};
    const notes: Record<string, Place[]> = {};
    for (const g of detail.groups) {
      const r = awardsFromStandings(g.standings);
      next[g.id] = r.picks;
      notes[g.id] = r.unresolved;
    }
    setPicks(next);
    setUnresolved(notes);
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

  const placeStyle: Record<Place, string> = {
    winners: "border-gold bg-gold-soft",
    runnersUp: "border-silver bg-silver-soft",
    third: "border-bronze bg-bronze-soft",
  };

  return (
    <Sheet
      label="대회 종료"
      title="대회 종료 · 수상자 확정"
      description={
        <>
          이름을 누를 때마다 우승 → 준우승 → 3위 → 해제 순으로 바뀝니다.
          <br />
          우승·준우승 2명씩은 필수, 3위 2명은 선택입니다.
        </>
      }
      onClose={onClose}
      footer={
        <div className="grid grid-cols-[auto_1fr] gap-2">
          <Button variant="secondary" onClick={onClose}>
            취소
          </Button>
          <Button disabled={!valid || busy} onClick={submit}>
            {busy ? "처리 중…" : "확정하고 대회 종료"}
          </Button>
        </div>
      }
    >
      {unplayed > 0 && (
        <Notice tone="warning">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          점수가 입력되지 않은 경기가 {unplayed}개 있습니다. 그대로 종료할 수 있습니다.
        </Notice>
      )}

      <Button variant="secondary" className="mt-3 w-full first:mt-0" onClick={fillFromStandings} disabled={busy}>
        <ListOrdered className="size-5" />
        순위표대로 채우기
      </Button>
      <p className="mt-1.5 px-1 text-xs text-muted">
        {detail.groups.some((g) => g.method === "HANUL_AB")
          ? "AA: 1·2위 우승, 3·4위 준우승, 5·6위 3위 / AB: 각 조 같은 순위끼리 한 팀. "
          : "1·2위 우승, 3·4위 준우승, 5·6위 3위. "}
        채운 뒤에도 이름을 눌러 바꿀 수 있습니다.
      </p>

      {detail.groups.map((g) => {
        const p = picks[g.id];
        const missing = unresolved?.[g.id] ?? [];
        const people = [...g.participants].sort((a, b) => a.displayName.localeCompare(b.displayName, "ko"));
        return (
          <section key={g.id} className="mt-5 first:mt-2">
            <div className="flex items-baseline justify-between">
              <h3 className="text-base font-semibold">{g.name}</h3>
              <span className="tabular text-xs text-muted">
                {PLACES.map((pl) => `${pl.icon} ${p[pl.key].length}/2`).join("  ")}
              </span>
            </div>
            <ul className="mt-2 grid grid-cols-2 gap-2">
              {people.map((person) => {
                const place = PLACES.find((pl) => p[pl.key].includes(person.code));
                return (
                  <li key={person.code}>
                    <button
                      onClick={() => cycle(g.id, person.code)}
                      className={`flex min-h-14 w-full items-center gap-2.5 rounded-box border px-3 text-left shadow-xs transition active:scale-[0.98] ${
                        place ? placeStyle[place.key] : "border-line-strong bg-surface hover:bg-subtle"
                      }`}
                      aria-label={`${person.displayName} ${place ? place.label : "선택 안 함"}`}
                    >
                      <span className="grid size-7 shrink-0 place-items-center text-lg">{place?.icon ?? ""}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[17px] font-medium">{person.displayName}</span>
                        <span className="text-xs text-muted">{place?.label ?? " "}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {missing.length > 0 && (
              <p className="mt-2 text-sm text-warning">
                공동 순위 등으로 {missing.map((m) => PLACES.find((pl) => pl.key === m)!.label).join("·")} 자리는 순위표로 정할 수
                없어 비워 두었습니다. 직접 선택해 주세요{missing.length === 1 && missing[0] === "third" ? " (3위는 비워 둬도 됩니다)" : ""}.
              </p>
            )}
            {p.third.length === 1 && <p className="mt-2 text-sm text-danger">3위는 2명을 선택하거나 비워 두세요.</p>}
          </section>
        );
      })}

      {error && <p className="mt-3 text-sm font-medium text-danger">{error}</p>}
    </Sheet>
  );
}

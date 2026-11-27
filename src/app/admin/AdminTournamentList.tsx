"use client";

import { AlertTriangle, Check, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { TournamentCard } from "@/components/TournamentCard";
import { Button, Card, formatDate, Notice, StatusBadge } from "@/components/ui";
import { api } from "@/lib/client";
import type { TournamentSummary } from "@/server/repo";

/**
 * 관리자 대회 목록.
 * '선택 삭제' 모드에서 종료된 대회를 골라 한 번에 삭제한다.
 * (진행 중 대회는 대회 상세 화면에서 점수 입력 전에만 삭제 가능)
 */
export function AdminTournamentList({ list }: { list: TournamentSummary[] }) {
  const router = useRouter();
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const completedCount = list.filter((t) => t.status === "COMPLETED").length;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function exit() {
    setSelecting(false);
    setSelected(new Set());
    setError(null);
  }

  async function removeSelected() {
    const targets = list.filter((t) => selected.has(t.id));
    if (targets.length === 0) return;
    const names = targets.map((t) => `· ${t.title}`).join("\n");
    if (
      !confirm(
        `종료된 대회 ${targets.length}개를 삭제할까요?\n${names}\n\n대진·점수·수상 기록이 모두 지워지고 명예의 전당·개인 통계에서도 빠집니다. 되돌릴 수 없습니다.`,
      )
    )
      return;

    setBusy(true);
    setError(null);
    const failed: string[] = [];
    for (const t of targets) {
      try {
        await api(`/api/tournaments/${t.id}`, "DELETE");
      } catch (e) {
        failed.push(`${t.title}: ${e instanceof Error ? e.message : "실패"}`);
      }
    }
    setBusy(false);
    router.refresh();
    if (failed.length > 0) {
      setError(`일부 대회를 삭제하지 못했습니다.\n${failed.join("\n")}`);
      setSelected(new Set(targets.filter((t) => failed.some((f) => f.startsWith(`${t.title}:`))).map((t) => t.id)));
    } else {
      exit();
    }
  }

  return (
    <div className="px-4">
      {completedCount > 0 && (
        <div className="flex items-center justify-between pb-3">
          <p className="text-sm text-muted">
            {selecting ? `종료된 대회를 선택하세요 · ${selected.size}개 선택됨` : `전체 ${list.length}개`}
          </p>
          {selecting ? (
            <button
              type="button"
              onClick={exit}
              disabled={busy}
              className="inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-sm font-medium text-muted hover:text-ink"
            >
              <X className="size-4" />
              취소
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setSelecting(true)}
              className="inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-sm font-medium text-danger hover:underline"
            >
              <Trash2 className="size-4" />
              선택 삭제
            </button>
          )}
        </div>
      )}

      {error && (
        <div className="pb-3">
          <Notice tone="danger">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span className="whitespace-pre-line">{error}</span>
          </Notice>
        </div>
      )}

      <ul className="space-y-3">
        {list.map((t) => (
          <li key={t.id}>
            {selecting ? (
              <SelectableCard
                t={t}
                checked={selected.has(t.id)}
                disabled={t.status !== "COMPLETED" || busy}
                onToggle={() => toggle(t.id)}
              />
            ) : (
              <TournamentCard t={t} href={`/admin/tournaments/${t.id}`} emptyText="그룹 없음 — 눌러서 그룹 만들기" />
            )}
          </li>
        ))}
      </ul>

      {selecting && (
        <div className="sticky bottom-[calc(1rem+env(safe-area-inset-bottom))] z-30 pt-4">
          <Button
            variant="danger"
            className="w-full shadow-lg"
            disabled={selected.size === 0 || busy}
            onClick={removeSelected}
          >
            <Trash2 className="size-5" />
            {busy ? "삭제 중…" : selected.size > 0 ? `선택한 대회 ${selected.size}개 삭제` : "삭제할 대회를 선택하세요"}
          </Button>
        </div>
      )}
    </div>
  );
}

function SelectableCard({
  t,
  checked,
  disabled,
  onToggle,
}: {
  t: TournamentSummary;
  checked: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={onToggle}
      className="block w-full text-left transition active:scale-[0.99] disabled:opacity-40 disabled:active:scale-100"
    >
      <Card className={`flex items-center gap-3 p-4 transition ${checked ? "border-danger ring-4 ring-danger/10" : ""}`}>
        <span
          className={`grid size-6 shrink-0 place-items-center rounded-md border-2 transition ${
            checked ? "border-danger bg-danger text-surface" : "border-line-strong bg-surface"
          }`}
          aria-hidden
        >
          {checked && <Check className="size-4" strokeWidth={3} />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <StatusBadge status={t.status} />
            <span className="text-xs text-muted">{formatDate(t.date)}</span>
          </div>
          <p className="mt-2 truncate text-base font-semibold">{t.title}</p>
          <p className="mt-0.5 truncate text-sm text-muted">
            {t.status !== "COMPLETED"
              ? "진행 중 대회는 상세 화면에서 삭제"
              : t.groups.length === 0
                ? "그룹 없음"
                : t.groups.map((g) => `${g.name} ${g.size}명`).join(" · ")}
          </p>
        </div>
      </Card>
    </button>
  );
}

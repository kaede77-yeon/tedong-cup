"use client";

import { AlertTriangle, Megaphone, Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatNoticeDate } from "@/components/NoticeBar";
import { Sheet, StepLabel } from "@/components/Sheet";
import { Button, Notice } from "@/components/ui";
import { api } from "@/lib/client";
import type { NoticeItem } from "@/lib/types";

const TITLE_MAX = 60;
const CONTENT_MAX = 2000;

type Draft = { id?: string; title: string; content: string };

export function NoticeManager({ initial }: { initial: NoticeItem[] }) {
  const router = useRouter();
  const [notices, setNotices] = useState(initial);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      setNotices(await api<NoticeItem[]>("/api/notices"));
      router.refresh();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "실패");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!draft) return;
    const body = { title: draft.title, content: draft.content };
    const ok = await run(() =>
      draft.id ? api(`/api/notices/${draft.id}`, "PATCH", body) : api("/api/notices", "POST", body),
    );
    if (ok) setDraft(null);
  }

  return (
    <div className="px-4">
      <Button className="w-full" onClick={() => setDraft({ title: "", content: "" })}>
        <Plus className="size-5" />
        공지 작성
      </Button>

      {error && !draft && (
        <div className="mt-3">
          <Notice tone="danger">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            {error}
          </Notice>
        </div>
      )}

      <ul className="mt-4 space-y-3">
        {notices.length === 0 && (
          <li className="rounded-2xl border border-line bg-surface p-8 text-center text-sm text-muted shadow-xs">
            등록된 공지사항이 없습니다.
          </li>
        )}
        {notices.map((n, i) => (
          <li
            key={n.id}
            className={`rounded-2xl border bg-surface p-4 shadow-xs ${i === 0 ? "border-primary/40" : "border-line"}`}
          >
            <div className="flex items-center gap-2">
              {i === 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2 py-0.5 text-[13px] font-semibold text-primary-text">
                  <Megaphone className="size-3" aria-hidden />
                  상단 노출 중
                </span>
              )}
              <span className="text-xs text-muted">{formatNoticeDate(n.updatedAt)}</span>
            </div>
            <p className="mt-2 text-base font-semibold break-words">{n.title}</p>
            {n.content && <p className="mt-1 line-clamp-2 text-sm whitespace-pre-wrap text-muted">{n.content}</p>}
            <div className="mt-3 flex justify-end gap-1">
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setError(null);
                  setDraft({ id: n.id, title: n.title, content: n.content });
                }}
                className="inline-flex min-h-11 items-center gap-1 rounded-lg px-3 text-sm font-medium text-muted transition hover:bg-subtle hover:text-ink"
              >
                <Pencil className="size-4" />
                수정
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  confirm(`'${n.title}' 공지를 삭제할까요?`) && run(() => api(`/api/notices/${n.id}`, "DELETE"))
                }
                className="inline-flex min-h-11 items-center gap-1 rounded-lg px-3 text-sm font-medium text-danger transition hover:bg-danger-soft"
              >
                <Trash2 className="size-4" />
                삭제
              </button>
            </div>
          </li>
        ))}
      </ul>

      {draft && (
        <Sheet
          label={draft.id ? "공지 수정" : "공지 작성"}
          title={draft.id ? "공지 수정" : "공지 작성"}
          description="제목은 사용자 화면 상단에 한 줄로 표시됩니다."
          onClose={() => !busy && setDraft(null)}
          footer={
            <div className="grid grid-cols-[auto_1fr] gap-2">
              <Button variant="secondary" disabled={busy} onClick={() => setDraft(null)}>
                취소
              </Button>
              <Button type="submit" form="notice-form" disabled={busy || !draft.title.trim()}>
                {busy ? "저장 중…" : "저장"}
              </Button>
            </div>
          }
        >
          <form id="notice-form" onSubmit={save} className="space-y-4">
            <div>
              <StepLabel>제목 (한줄 공지)</StepLabel>
              <input
                autoFocus
                required
                maxLength={TITLE_MAX}
                placeholder="예) 12월 월례대회는 첫째 주 토요일입니다"
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                className="input"
              />
              <p className="mt-1 text-right text-xs text-faint">
                {draft.title.length}/{TITLE_MAX}
              </p>
            </div>
            <div>
              <StepLabel>내용 (선택)</StepLabel>
              <textarea
                rows={8}
                maxLength={CONTENT_MAX}
                placeholder="공지를 누르면 보이는 전체 내용"
                value={draft.content}
                onChange={(e) => setDraft({ ...draft, content: e.target.value })}
                className="input h-auto min-h-40 resize-y py-3 leading-relaxed"
              />
              <p className="mt-1 text-right text-xs text-faint">
                {draft.content.length}/{CONTENT_MAX}
              </p>
            </div>
            {error && (
              <Notice tone="danger">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                {error}
              </Notice>
            )}
          </form>
        </Sheet>
      )}
    </div>
  );
}

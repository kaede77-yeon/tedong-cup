"use client";

import { useState } from "react";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Button, Card, Notice } from "@/components/ui";
import { api } from "@/lib/client";
import type { Member } from "@/lib/types";

type Draft = { id?: string; name: string; nickname: string };

export function MemberManager({ initial }: { initial: Member[] }) {
  const [members, setMembers] = useState(initial);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [query, setQuery] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = async () => setMembers(await api<Member[]>("/api/members"));

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await reload();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "실패");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function saveDraft(e: React.FormEvent) {
    e.preventDefault();
    if (!draft) return;
    const body = { name: draft.name, nickname: draft.nickname };
    const ok = await run(() =>
      draft.id ? api(`/api/members/${draft.id}`, "PATCH", body) : api("/api/members", "POST", body),
    );
    if (ok) setDraft(null);
  }

  const q = query.trim();
  const visible = members
    .filter((m) => showInactive || m.isActive)
    .filter((m) => !q || m.name.includes(q) || m.nickname?.includes(q));
  const activeCount = members.filter((m) => m.isActive).length;

  return (
    <div className="px-4">
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-faint"
            aria-hidden
          />
          <input
            type="search"
            placeholder="이름 검색"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="input pl-10"
          />
        </div>
        <Button onClick={() => setDraft({ name: "", nickname: "" })}>
          <Plus className="size-5" />
          추가
        </Button>
      </div>
      <label className="mt-3 flex items-center gap-2 px-1 text-sm text-muted">
        <input
          type="checkbox"
          className="size-5 accent-primary"
          checked={showInactive}
          onChange={(e) => setShowInactive(e.target.checked)}
        />
        비활성 회원 포함 (활성 {activeCount}명 / 전체 {members.length}명)
      </label>

      {error && (
        <div className="mt-3">
          <Notice tone="danger">{error}</Notice>
        </div>
      )}

      {draft && (
        <Card className="mt-4 p-4">
          <form onSubmit={saveDraft} className="space-y-3">
            <p className="text-base font-semibold">{draft.id ? "회원 수정" : "회원 추가"}</p>
            <input
              autoFocus
              required
              placeholder="이름"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              className="input"
            />
            <input
              placeholder="닉네임/구분자 (선택, 동명이인 구분용)"
              value={draft.nickname}
              onChange={(e) => setDraft({ ...draft, nickname: e.target.value })}
              className="input"
            />
            <div className="grid grid-cols-[auto_1fr] gap-2">
              <Button variant="secondary" onClick={() => setDraft(null)}>
                취소
              </Button>
              <Button type="submit" disabled={busy || !draft.name.trim()}>
                저장
              </Button>
            </div>
          </form>
        </Card>
      )}

      <ul className="mt-4 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface shadow-xs">
        {visible.length === 0 && <li className="p-8 text-center text-sm text-muted">회원이 없습니다.</li>}
        {visible.map((m) => (
          <li key={m.id} className={`flex items-center gap-1 py-1.5 pr-2 pl-4 ${m.isActive ? "" : "opacity-50"}`}>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-medium">
                {m.name}
                {m.nickname && <span className="ml-1.5 text-sm text-muted">{m.nickname}</span>}
              </p>
            </div>
            <button
              className="grid size-11 place-items-center rounded-lg text-muted transition hover:bg-subtle hover:text-ink"
              onClick={() => setDraft({ id: m.id, name: m.name, nickname: m.nickname ?? "" })}
              aria-label={`${m.name} 수정`}
            >
              <Pencil className="size-4" />
            </button>
            <button
              className="min-h-11 rounded-lg px-2.5 text-xs font-medium text-muted transition hover:bg-subtle hover:text-ink"
              disabled={busy}
              onClick={() => run(() => api(`/api/members/${m.id}`, "PATCH", { isActive: !m.isActive }))}
            >
              {m.isActive ? "비활성" : "활성화"}
            </button>
            <button
              className="grid size-11 place-items-center rounded-lg text-muted transition hover:bg-danger-soft hover:text-danger"
              disabled={busy}
              onClick={() =>
                confirm(`${m.name} 회원을 삭제할까요?`) && run(() => api(`/api/members/${m.id}`, "DELETE"))
              }
              aria-label={`${m.name} 삭제`}
            >
              <Trash2 className="size-4" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

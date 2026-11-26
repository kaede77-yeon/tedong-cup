"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
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
        <input
          type="search"
          placeholder="이름 검색"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-12 min-w-0 flex-1 rounded-xl border-2 border-ink/20 px-3 text-base"
        />
        <Button onClick={() => setDraft({ name: "", nickname: "" })}>＋ 추가</Button>
      </div>
      <label className="mt-2 flex items-center gap-2 text-sm font-semibold text-muted">
        <input type="checkbox" className="size-5" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
        비활성 회원 포함 (활성 {activeCount}명 / 전체 {members.length}명)
      </label>

      {error && <p className="mt-3 rounded-lg bg-red-50 p-3 font-bold text-red-700">{error}</p>}

      {draft && (
        <form onSubmit={saveDraft} className="mt-3 space-y-2 rounded-2xl border-2 border-court p-4">
          <p className="font-extrabold">{draft.id ? "회원 수정" : "회원 추가"}</p>
          <input
            autoFocus
            required
            placeholder="이름"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            className="h-12 w-full rounded-xl border-2 border-ink/20 px-3 text-base"
          />
          <input
            placeholder="닉네임/구분자 (선택, 동명이인 구분용)"
            value={draft.nickname}
            onChange={(e) => setDraft({ ...draft, nickname: e.target.value })}
            className="h-12 w-full rounded-xl border-2 border-ink/20 px-3 text-base"
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
      )}

      <ul className="mt-3 divide-y divide-ink/10 rounded-2xl border-2 border-ink/10">
        {visible.length === 0 && <li className="p-6 text-center text-muted">회원이 없습니다.</li>}
        {visible.map((m) => (
          <li key={m.id} className={`flex items-center gap-2 px-3 py-2 ${m.isActive ? "" : "opacity-50"}`}>
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-bold">
                {m.name}
                {m.nickname && <span className="ml-1 text-sm font-semibold text-muted">({m.nickname})</span>}
              </p>
            </div>
            <button
              className="min-h-11 rounded-lg px-2 text-sm font-bold text-court"
              onClick={() => setDraft({ id: m.id, name: m.name, nickname: m.nickname ?? "" })}
            >
              수정
            </button>
            <button
              className="min-h-11 rounded-lg px-2 text-sm font-bold text-muted"
              disabled={busy}
              onClick={() => run(() => api(`/api/members/${m.id}`, "PATCH", { isActive: !m.isActive }))}
            >
              {m.isActive ? "비활성" : "활성화"}
            </button>
            <button
              className="min-h-11 rounded-lg px-2 text-sm font-bold text-red-700"
              disabled={busy}
              onClick={() => confirm(`${m.name} 회원을 삭제할까요?`) && run(() => api(`/api/members/${m.id}`, "DELETE"))}
            >
              삭제
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

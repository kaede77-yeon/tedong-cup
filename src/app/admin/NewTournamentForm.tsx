"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui";
import { api } from "@/lib/client";
import type { Tournament } from "@/lib/types";

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function NewTournamentForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState("");
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [y, m] = date.split("-").map(Number);
  const placeholder = date ? `${y}년 ${m}월 월례대회` : "";

  if (!open) {
    return (
      <Button
        className="w-full"
        onClick={() => {
          // 오늘 날짜는 렌더링이 아닌 이벤트 시점에 계산 (prerender 고정 방지)
          setDate(today());
          setOpen(true);
        }}
      >
        ＋ 새 월례대회 만들기
      </Button>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const t = await api<Tournament>("/api/tournaments", "POST", { date, title: title || undefined });
      router.push(`/admin/tournaments/${t.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "생성 실패");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-2xl border-2 border-court p-4">
      <label className="block">
        <span className="text-sm font-bold">대회 일자</span>
        <input
          type="date"
          required
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="mt-1 block h-12 w-full rounded-xl border-2 border-ink/20 px-3 text-base"
        />
      </label>
      <label className="block">
        <span className="text-sm font-bold">대회명 (비우면 자동)</span>
        <input
          value={title}
          placeholder={placeholder}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1 block h-12 w-full rounded-xl border-2 border-ink/20 px-3 text-base"
        />
      </label>
      {error && <p className="font-bold text-red-700">{error}</p>}
      <div className="grid grid-cols-[auto_1fr] gap-2">
        <Button variant="secondary" onClick={() => setOpen(false)}>
          취소
        </Button>
        <Button type="submit" disabled={busy || !date}>
          {busy ? "생성 중…" : "대회 생성"}
        </Button>
      </div>
    </form>
  );
}

"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui";
import { api } from "@/lib/client";

export function LoginForm() {
  const next = useSearchParams().get("next");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/api/auth/session", "POST", { password });
      // 오픈 리다이렉트 방지: 내부 경로만 허용.
      // 로그인 전 prefetch된 "/admin → 로그인 리다이렉트" 응답이 클라이언트 라우터 캐시에 남아 있으므로
      // 인증 상태가 바뀌는 시점에는 전체 페이지 이동으로 캐시를 비운다.
      const target = new URL(next?.startsWith("/admin") ? next : "/admin", window.location.origin);
      window.location.replace(target.href);
    } catch (err) {
      setError(err instanceof Error ? err.message : "로그인 실패");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 px-4">
      <label className="block">
        <span className="text-sm font-bold">비밀번호</span>
        <input
          type="password"
          autoComplete="current-password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 block h-14 w-full rounded-xl border-2 border-ink/20 px-4 text-lg focus:border-court focus:outline-none"
        />
      </label>
      {error && <p className="font-bold text-red-700">{error}</p>}
      <Button type="submit" disabled={!password || busy} className="w-full">
        {busy ? "확인 중…" : "로그인"}
      </Button>
    </form>
  );
}

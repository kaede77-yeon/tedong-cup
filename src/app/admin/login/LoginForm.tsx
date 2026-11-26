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
    <form onSubmit={submit} className="mx-4 space-y-4 rounded-2xl border border-line bg-surface p-5 shadow-xs">
      <label className="block">
        <span className="text-sm font-medium text-muted">비밀번호</span>
        <input
          type="password"
          autoComplete="current-password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="input mt-1.5 h-14 text-lg"
        />
      </label>
      {error && <p className="text-sm font-medium text-danger">{error}</p>}
      <Button type="submit" disabled={!password || busy} className="w-full">
        {busy ? "확인 중…" : "로그인"}
      </Button>
    </form>
  );
}

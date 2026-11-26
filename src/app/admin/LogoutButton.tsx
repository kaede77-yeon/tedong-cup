"use client";

import { usePathname } from "next/navigation";
import { api } from "@/lib/client";

export function LogoutButton() {
  const pathname = usePathname();
  if (pathname === "/admin/login") return null;
  return (
    <button
      className="rounded-lg px-3 py-3 text-sm font-bold text-muted"
      onClick={async () => {
        await api("/api/auth/session", "DELETE");
        // 로그인 상태로 캐시된 관리자 화면이 남지 않도록 전체 페이지 이동
        window.location.replace(new URL("/", window.location.origin).href);
      }}
    >
      로그아웃
    </button>
  );
}

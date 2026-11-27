"use client";

import { LogOut, Palette } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { api } from "@/lib/client";

const LINKS = [
  { href: "/admin", label: "대회 운영", match: (p: string) => p === "/admin" || p.startsWith("/admin/tournaments") },
  { href: "/admin/members", label: "회원 명부", match: (p: string) => p.startsWith("/admin/members") },
  { href: "/admin/notices", label: "공지사항", match: (p: string) => p.startsWith("/admin/notices") },
];

function Bar({ pathname }: { pathname: string | null }) {
  const onLogin = pathname === "/admin/login";
  return (
    <div className="flex items-center gap-2 px-4 pt-3">
      <nav className="grid flex-1 grid-cols-3 rounded-tab bg-subtle p-1" aria-label="관리 메뉴">
        {LINKS.map((l) => {
          const active = pathname !== null && l.match(pathname);
          return (
            <Link
              key={l.href}
              href={l.href}
              aria-current={active ? "page" : undefined}
              className={`grid h-9 place-items-center rounded-tab-item text-sm font-semibold transition ${
                active ? "bg-tab-on text-tab-on-fg shadow-sm" : "text-muted hover:text-ink"
              }`}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>
      {pathname !== null && !onLogin && (
        <Link
          href="/admin/settings"
          aria-label="화면 테마"
          title="화면 테마"
          aria-current={pathname.startsWith("/admin/settings") ? "page" : undefined}
          className={`-mr-2 grid size-11 shrink-0 place-items-center rounded-btn transition hover:bg-subtle hover:text-ink ${
            pathname.startsWith("/admin/settings") ? "text-ink" : "text-muted"
          }`}
        >
          <Palette className="size-5" />
        </Link>
      )}
      {pathname !== null && !onLogin && (
        <button
          className="grid size-11 place-items-center rounded-btn text-muted transition hover:bg-subtle hover:text-ink"
          aria-label="로그아웃"
          title="로그아웃"
          onClick={async () => {
            await api("/api/auth/session", "DELETE");
            // 로그인 상태로 캐시된 관리자 화면이 남지 않도록 전체 페이지 이동
            window.location.replace(new URL("/", window.location.origin).href);
          }}
        >
          <LogOut className="size-5" />
        </button>
      )}
    </div>
  );
}

/** 관리자 상단 메뉴 (현재 경로 강조 + 로그아웃) */
export function AdminNav() {
  return <Bar pathname={usePathname()} />;
}

/** 정적 셸용: 강조 없이 표시 (클라이언트 컴포넌트의 정적 속성은 서버에서 참조할 수 없으므로 별도 export) */
export function AdminNavFallback() {
  return <Bar pathname={null} />;
}

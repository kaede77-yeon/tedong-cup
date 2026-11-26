"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "진행중", icon: "🎾", match: (p: string) => p === "/" },
  { href: "/tournaments", label: "대회기록", icon: "📋", match: (p: string) => p.startsWith("/tournaments") },
  { href: "/hall-of-fame", label: "명예의전당", icon: "🏆", match: (p: string) => p.startsWith("/hall-of-fame") },
  { href: "/members", label: "개인통계", icon: "📊", match: (p: string) => p.startsWith("/members") },
];

/** 정적 셸에서도 렌더링되는 탭바 (pathname이 없으면 강조 없이 표시) */
export function NavBar({ pathname }: { pathname: string | null }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[480px] border-t-2 border-ink/10 bg-white pb-[env(safe-area-inset-bottom)]">
      <ul className="grid grid-cols-4">
        {TABS.map((t) => {
          const active = pathname !== null && t.match(pathname);
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                className={`flex h-16 flex-col items-center justify-center gap-0.5 text-xs font-bold ${
                  active ? "text-court" : "text-muted"
                }`}
                aria-current={active ? "page" : undefined}
              >
                <span className="text-xl leading-none" aria-hidden>
                  {t.icon}
                </span>
                {t.label}
                <span className={`mt-0.5 h-1 w-6 rounded-full ${active ? "bg-court" : "bg-transparent"}`} />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** 현재 경로 강조 버전 — <Suspense fallback={<NavBar pathname={null} />}> 안에서 사용 */
export function BottomNav() {
  return <NavBar pathname={usePathname()} />;
}

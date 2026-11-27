"use client";

import { BarChart3, CalendarDays, Trophy, Zap, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS: { href: string; label: string; icon: LucideIcon; match: (p: string) => boolean }[] = [
  { href: "/", label: "대회진행", icon: Zap, match: (p) => p === "/" },
  { href: "/tournaments", label: "지난대회기록", icon: CalendarDays, match: (p) => p.startsWith("/tournaments") },
  { href: "/hall-of-fame", label: "명예의전당", icon: Trophy, match: (p) => p.startsWith("/hall-of-fame") },
  { href: "/members", label: "개인통계", icon: BarChart3, match: (p) => p.startsWith("/members") },
];

/** 정적 셸에서도 렌더링되는 탭바 (pathname이 없으면 강조 없이 표시) */
export function NavBar({ pathname }: { pathname: string | null }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[480px] border-t border-line bg-surface/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-md">
      <ul className="grid grid-cols-4">
        {TABS.map(({ href, label, icon: Icon, match }) => {
          const active = pathname !== null && match(pathname);
          return (
            <li key={href}>
              <Link
                href={href}
                className={`flex h-16 flex-col items-center justify-center gap-1 text-[13px] font-medium transition ${
                  active ? "text-primary-text" : "text-muted hover:text-ink"
                }`}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="size-[22px]" strokeWidth={active ? 2.4 : 1.8} aria-hidden />
                {label}
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

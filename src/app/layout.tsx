import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { LogoIcon } from "@/components/LogoIcon";
import { getCachedSiteTheme } from "@/server/theme";
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "테동회 월례대회", template: "%s · 테동회" },
  description: "테동회 월례대회 대진표, 실시간 순위, 역대 기록",
};

/** 브라우저 상단 색(themeColor)도 선택된 테마의 배경색에 맞춘다 */
const THEME_COLOR = {
  default: { light: "#f7f7fb", dark: "#0b0d14" },
  nike: { light: "#ffffff", dark: "#0d0d0d" },
} as const;

export async function generateViewport(): Promise<Viewport> {
  const c = THEME_COLOR[await getCachedSiteTheme()];
  return {
    width: "device-width",
    initialScale: 1,
    themeColor: [
      { media: "(prefers-color-scheme: light)", color: c.light },
      { media: "(prefers-color-scheme: dark)", color: c.dark },
    ],
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // 관리자가 선택한 사이트 테마 (캐시됨 → 정적 셸에 포함, 첫 화면부터 적용)
  const theme = await getCachedSiteTheme();
  return (
    <html lang="ko" className="h-full" data-theme={theme}>
      <body className="min-h-full antialiased">
        <div className="mx-auto flex min-h-dvh max-w-[480px] flex-col">
          <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-bg/80 px-4 backdrop-blur-md">
            <Link href="/" className="flex items-center gap-2 text-[20px] font-bold tracking-tight">
              <LogoIcon />
              테동회 대회관리
            </Link>
            <Link
              href="/admin"
              className="-my-1 inline-flex h-9 items-center rounded-full border border-line-strong bg-surface px-4 text-sm font-semibold text-ink shadow-xs transition hover:border-primary hover:text-primary-text active:scale-[0.97]"
            >
              관리자
            </Link>
          </header>
          <main className="flex-1 pb-8">{children}</main>
        </div>
      </body>
    </html>
  );
}

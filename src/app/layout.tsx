import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { LogoIcon } from "@/components/LogoIcon";
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "테동회 월례대회", template: "%s · 테동회" },
  description: "테동회 월례대회 대진표, 실시간 순위, 역대 기록",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f7fb" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0d14" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full">
      <body className="min-h-full antialiased">
        <div className="mx-auto flex min-h-dvh max-w-[480px] flex-col">
          <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-bg/80 px-4 backdrop-blur-md">
            <Link href="/" className="flex items-center gap-2 text-[17px] font-bold tracking-tight">
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

import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "테동회 월례대회", template: "%s · 테동회" },
  description: "테동회 월례대회 대진표, 실시간 순위, 역대 기록",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f5132",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full">
      <body className="min-h-full antialiased">
        <div className="mx-auto flex min-h-dvh max-w-[480px] flex-col bg-white shadow-sm">
          <header className="sticky top-0 z-30 flex h-14 items-center justify-between bg-court px-4 text-white">
            <Link href="/" className="text-lg font-extrabold tracking-tight">
              🎾 테동회 월례대회
            </Link>
            <Link href="/admin" className="rounded-md px-2 py-1 text-sm font-semibold text-white/80 hover:bg-white/10">
              관리
            </Link>
          </header>
          <main className="flex-1 pb-8">{children}</main>
        </div>
      </body>
    </html>
  );
}

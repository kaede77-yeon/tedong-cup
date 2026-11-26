import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { TournamentSummary } from "@/server/repo";
import { Card, formatDate, StatusBadge } from "./ui";

/** 대회 목록 카드 (공개 기록 · 관리자 목록 공용) */
export function TournamentCard({ t, href, emptyText = "그룹 없음" }: { t: TournamentSummary; href: string; emptyText?: string }) {
  return (
    <Link href={href} className="group block transition active:scale-[0.99]">
      <Card className="flex items-center gap-3 p-4 transition group-hover:border-line-strong">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <StatusBadge status={t.status} />
            <span className="text-xs text-muted">{formatDate(t.date)}</span>
          </div>
          <p className="mt-2 truncate text-base font-semibold">{t.title}</p>
          <p className="mt-0.5 truncate text-sm text-muted">
            {t.groups.length === 0 ? emptyText : t.groups.map((g) => `${g.name} ${g.size}명`).join(" · ")}
          </p>
        </div>
        <ChevronRight className="size-5 shrink-0 text-faint transition group-hover:translate-x-0.5" aria-hidden />
      </Card>
    </Link>
  );
}

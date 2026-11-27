import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { Card, Empty, formatDate, Loading, rankLabel, SectionTitle } from "@/components/ui";
import { load } from "@/server/page";
import { getMemberDetail, memberLabel } from "@/server/repo";

export default function MemberPage({ params }: PageProps<"/members/[id]">) {
  return (
    <Suspense fallback={<Loading />}>
      <Detail params={params} />
    </Suspense>
  );
}

function Stat({ label, value, accent, wide }: { label: string; value: string | number; accent?: boolean; wide?: boolean }) {
  return (
    <div className={`rounded-card border border-line bg-surface p-3.5 text-center shadow-xs ${wide ? "col-span-3" : ""}`}>
      <p className="text-xs text-muted">{label}</p>
      <p className={`tabular mt-1 text-xl font-bold ${accent ? "text-primary-text" : ""}`}>{value}</p>
    </div>
  );
}

async function Detail({ params }: Pick<PageProps<"/members/[id]">, "params">) {
  const { id } = await params;
  const { member, stats } = await load(() => getMemberDetail(id));

  return (
    <div>
      <div className="px-4 pt-4 pb-4">
        <Link href="/members" className="-ml-1.5 inline-flex items-center gap-0.5 text-sm font-medium text-muted hover:text-ink">
          <ChevronLeft className="size-4" />
          개인 통계
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">{memberLabel(member)}</h1>
        {!member.isActive && <p className="mt-1 text-sm text-muted">비활성 회원</p>}
      </div>

      {!stats ? (
        <Empty>종료된 대회 참가 기록이 없습니다.</Empty>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2 px-4">
            <Stat label="🥇 우승" value={stats.titles} accent />
            <Stat label="🥈 준우승" value={stats.runnerUps} accent />
            <Stat label="🥉 3위" value={stats.thirds} accent />
            <Stat label="승률" value={`${stats.winRate.toFixed(1)}%`} />
            <Stat label="참가 대회" value={stats.tournaments} />
            <Stat label="통산 득실차" value={stats.diff > 0 ? `+${stats.diff}` : stats.diff} />
            <Stat label="경기 (승-패)" value={`${stats.played} (${stats.wins}-${stats.losses})`} wide />
          </div>

          <SectionTitle aside={`${stats.history.length}건`}>대회별 기록</SectionTitle>
          <ul className="space-y-3 px-4">
            {stats.history.map((h) => (
              <li key={`${h.tournamentId}-${h.groupId}`}>
                <Link href={`/tournaments/${h.tournamentId}`} className="group block transition active:scale-[0.99]">
                  <Card className="flex items-center justify-between gap-3 p-4 transition group-hover:border-line-strong">
                    <div className="min-w-0">
                      <p className="text-xs text-muted">{formatDate(h.date)}</p>
                      <p className="mt-0.5 truncate text-[17px] font-semibold">
                        {h.title} · {h.groupName}
                        {h.side && ` ${h.side}그룹`}
                      </p>
                      <p className="tabular mt-0.5 text-sm text-muted">
                        {h.wins}승 {h.losses}패 · 득실 {h.diff > 0 ? `+${h.diff}` : h.diff}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="tabular text-xl font-bold">
                        {rankLabel(h.rank, h.tied)}
                        <span className="text-sm font-medium text-muted">/{h.groupSize}위</span>
                      </p>
                      {h.award && (
                        <p className="mt-0.5 text-xs font-medium text-muted">
                          {h.award === "WINNER" ? "🥇 우승" : h.award === "RUNNER_UP" ? "🥈 준우승" : "🥉 3위"}
                        </p>
                      )}
                    </div>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

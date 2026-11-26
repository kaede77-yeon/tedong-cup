import Link from "next/link";
import { Suspense } from "react";
import { Card, Empty, formatDate, Loading, rankLabel } from "@/components/ui";
import { load } from "@/server/page";
import { getMemberDetail, memberLabel } from "@/server/repo";

export default function MemberPage({ params }: PageProps<"/members/[id]">) {
  return (
    <Suspense fallback={<Loading />}>
      <Detail params={params} />
    </Suspense>
  );
}

function Stat({ label, value, strong, wide }: { label: string; value: string | number; strong?: boolean; wide?: boolean }) {
  return (
    <div className={`rounded-xl bg-gray-50 p-3 text-center ${wide ? "col-span-3" : ""}`}>
      <p className="text-xs font-bold text-muted">{label}</p>
      <p className={`tabular mt-0.5 font-black ${strong ? "text-2xl text-court" : "text-xl"}`}>{value}</p>
    </div>
  );
}

async function Detail({ params }: Pick<PageProps<"/members/[id]">, "params">) {
  const { id } = await params;
  const { member, stats } = await load(() => getMemberDetail(id));

  return (
    <div>
      <div className="px-4 pt-5 pb-3">
        <Link href="/members" className="text-sm font-bold text-court">
          ← 개인 통계
        </Link>
        <h1 className="mt-1 text-2xl font-extrabold">{memberLabel(member)}</h1>
        {!member.isActive && <p className="text-sm font-semibold text-muted">비활성 회원</p>}
      </div>

      {!stats ? (
        <Empty>종료된 대회 참가 기록이 없습니다.</Empty>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2 px-3">
            <Stat label="우승" value={`🥇 ${stats.titles}`} strong />
            <Stat label="준우승" value={`🥈 ${stats.runnerUps}`} strong />
            <Stat label="3위" value={`🥉 ${stats.thirds}`} strong />
            <Stat label="승률" value={`${stats.winRate.toFixed(1)}%`} strong />
            <Stat label="참가 대회" value={stats.tournaments} />
            <Stat label="통산 득실차" value={stats.diff > 0 ? `+${stats.diff}` : stats.diff} />
            <Stat label="경기 (승-패)" value={`${stats.played} (${stats.wins}-${stats.losses})`} wide />
          </div>

          <h2 className="px-4 pt-6 pb-2 text-lg font-extrabold">대회별 기록</h2>
          <ul className="space-y-2 px-3">
            {stats.history.map((h) => (
              <li key={`${h.tournamentId}-${h.groupId}`}>
                <Link href={`/tournaments/${h.tournamentId}`} className="block active:opacity-70">
                  <Card className="flex items-center justify-between gap-3 p-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-muted">{formatDate(h.date)}</p>
                      <p className="truncate text-base font-extrabold">
                        {h.title} · {h.groupName}
                        {h.side && ` ${h.side}그룹`}
                      </p>
                      <p className="tabular text-sm font-medium text-muted">
                        {h.wins}승 {h.losses}패 · 득실 {h.diff > 0 ? `+${h.diff}` : h.diff}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="tabular text-xl font-black">
                        {rankLabel(h.rank, h.tied)}
                        <span className="text-sm font-bold text-muted">/{h.groupSize}위</span>
                      </p>
                      {h.award && (
                        <p className="text-sm font-bold">
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

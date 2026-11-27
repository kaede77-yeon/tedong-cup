import Link from "next/link";
import { Suspense } from "react";
import { Empty, Loading, PageTitle } from "@/components/ui";
import { load } from "@/server/page";
import { getMemberStatsList } from "@/server/repo";

export const metadata = { title: "개인 통계" };

export default function MembersPage() {
  return (
    <>
      <PageTitle sub="종료된 대회 기준 회원별 누적 기록 (게스트 제외)">개인 누적 통계</PageTitle>
      <Suspense fallback={<Loading />}>
        <Ranking />
      </Suspense>
    </>
  );
}

async function Ranking() {
  const rows = await load(() => getMemberStatsList());
  if (rows.length === 0) return <Empty>종료된 대회 기록이 없습니다.</Empty>;

  return (
    <div className="px-4">
      <div className="overflow-hidden rounded-card border border-line bg-surface shadow-xs">
        <table className="tabular w-full border-collapse text-center text-[16px]">
          <thead>
            <tr className="border-b border-line bg-subtle/60 text-[13px] font-medium text-muted">
              <th className="w-9 py-2.5">#</th>
              <th className="py-2.5 text-left">이름</th>
              <th className="w-9">대회</th>
              <th className="w-12">승-패</th>
              <th className="w-14">승률</th>
              <th className="w-10">득실</th>
              <th className="w-14 pr-2 text-[11px] whitespace-nowrap">🥇🥈🥉</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r, i) => (
              <tr key={r.memberId}>
                <td className={`py-3 font-semibold ${i < 3 ? "text-primary-text" : "text-muted"}`}>{i + 1}</td>
                <td className="max-w-0 text-left">
                  <Link
                    href={`/members/${r.memberId}`}
                    className="block truncate py-1 text-[17px] font-medium underline-offset-4 hover:text-primary-text hover:underline"
                  >
                    {r.label}
                  </Link>
                </td>
                <td className="text-muted">{r.tournaments}</td>
                <td className="text-muted">
                  {r.wins}-{r.losses}
                </td>
                <td className="font-semibold">{r.winRate.toFixed(1)}%</td>
                <td className={r.diff > 0 ? "text-success" : r.diff < 0 ? "text-danger" : "text-muted"}>
                  {r.diff > 0 ? `+${r.diff}` : r.diff}
                </td>
                <td className="pr-2 text-muted">
                  {r.titles}·{r.runnerUps}·{r.thirds}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 px-1 text-xs text-muted">정렬: 우승 횟수 → 승률 → 승수 → 득실차</p>
    </div>
  );
}

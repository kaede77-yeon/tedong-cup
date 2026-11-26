import Link from "next/link";
import { Suspense } from "react";
import { Empty, Loading, PageTitle } from "@/components/ui";
import { load } from "@/server/page";
import { getMemberStatsList } from "@/server/repo";

export const metadata = { title: "개인 통계" };

export default function MembersPage() {
  return (
    <>
      <PageTitle sub="종료된 대회 기준 회원별 누적 기록 (게스트 제외)">📊 개인 누적 통계</PageTitle>
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
    <div className="px-2">
      <table className="tabular w-full border-collapse text-center text-[15px]">
        <thead>
          <tr className="border-b-2 border-ink text-xs font-extrabold text-muted">
            <th className="w-8 py-2">#</th>
            <th className="py-2 text-left">이름</th>
            <th className="w-9">대회</th>
            <th className="w-12">승-패</th>
            <th className="w-12">승률</th>
            <th className="w-10">득실</th>
            <th className="w-16">🥇/🥈/🥉</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.memberId} className="border-b border-ink/10">
              <td className="py-3 font-black">{i + 1}</td>
              <td className="max-w-0 text-left">
                <Link href={`/members/${r.memberId}`} className="block truncate text-base font-bold underline decoration-ink/20 underline-offset-4">
                  {r.label}
                </Link>
              </td>
              <td>{r.tournaments}</td>
              <td>
                {r.wins}-{r.losses}
              </td>
              <td className="font-extrabold">{r.winRate.toFixed(1)}%</td>
              <td className={r.diff > 0 ? "text-court" : r.diff < 0 ? "text-red-700" : ""}>
                {r.diff > 0 ? `+${r.diff}` : r.diff}
              </td>
              <td className="font-bold">
                {r.titles}/{r.runnerUps}/{r.thirds}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-3 px-2 text-xs font-medium text-muted">정렬: 우승 횟수 → 승률 → 승수 → 득실차</p>
    </div>
  );
}

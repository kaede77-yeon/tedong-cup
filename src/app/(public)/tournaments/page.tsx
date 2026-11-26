import Link from "next/link";
import { Suspense } from "react";
import { Card, Empty, formatDate, Loading, PageTitle, StatusBadge } from "@/components/ui";
import { YearFilter } from "@/components/YearFilter";
import { load } from "@/server/page";
import { listTournaments, listYears } from "@/server/repo";

export const metadata = { title: "대회 기록" };

export default function TournamentsPage({ searchParams }: PageProps<"/tournaments">) {
  return (
    <>
      <PageTitle sub="연도별·월별 월례대회 기록">대회 기록</PageTitle>
      <Suspense fallback={<Loading />}>
        <Archive searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Archive({ searchParams }: Pick<PageProps<"/tournaments">, "searchParams">) {
  const year = Number((await searchParams).year) || undefined;
  const [years, list] = await load(() => Promise.all([listYears(), listTournaments({ year })]));

  return (
    <>
      <YearFilter years={years} current={year} basePath="/tournaments" />
      {list.length === 0 ? (
        <Empty>대회 기록이 없습니다.</Empty>
      ) : (
        <ul className="space-y-2 px-3">
          {list.map((t) => (
            <li key={t.id}>
              <Link href={`/tournaments/${t.id}`} className="block active:opacity-70">
                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-muted">{formatDate(t.date)}</span>
                    <StatusBadge status={t.status} />
                  </div>
                  <p className="mt-1 text-lg font-extrabold">{t.title}</p>
                  <p className="mt-1 text-sm font-medium text-muted">
                    {t.groups.length === 0 ? "그룹 없음" : t.groups.map((g) => `${g.name} ${g.size}명`).join(" · ")}
                  </p>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

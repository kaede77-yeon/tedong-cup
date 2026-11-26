import { Suspense } from "react";
import { TournamentCard } from "@/components/TournamentCard";
import { Empty, Loading, PageTitle } from "@/components/ui";
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
        <ul className="space-y-3 px-4">
          {list.map((t) => (
            <li key={t.id}>
              <TournamentCard t={t} href={`/tournaments/${t.id}`} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

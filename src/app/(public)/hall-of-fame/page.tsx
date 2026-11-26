import Link from "next/link";
import { Suspense } from "react";
import { Card, Empty, formatDate, Loading, PageTitle } from "@/components/ui";
import { YearFilter } from "@/components/YearFilter";
import type { Laureate } from "@/lib/hallOfFame";
import { load } from "@/server/page";
import { getHallOfFame, listYears } from "@/server/repo";

export const metadata = { title: "명예의 전당" };

export default function HallOfFamePage({ searchParams }: PageProps<"/hall-of-fame">) {
  return (
    <>
      <PageTitle sub="월례대회 그룹별 우승·준우승·3위">🏆 명예의 전당</PageTitle>
      <Suspense fallback={<Loading />}>
        <List searchParams={searchParams} />
      </Suspense>
    </>
  );
}

function Names({ people }: { people: Laureate[] }) {
  return (
    <span className="font-extrabold">
      {people.map((p, i) => (
        <span key={i}>
          {i > 0 && " · "}
          {p.memberId ? (
            <Link href={`/members/${p.memberId}`} className="underline decoration-ink/20 underline-offset-4">
              {p.displayName}
            </Link>
          ) : (
            p.displayName
          )}
        </span>
      ))}
    </span>
  );
}

async function List({ searchParams }: Pick<PageProps<"/hall-of-fame">, "searchParams">) {
  const year = Number((await searchParams).year) || undefined;
  const [years, entries] = await load(() => Promise.all([listYears(), getHallOfFame(year)]));

  return (
    <>
      <YearFilter years={years} current={year} basePath="/hall-of-fame" />
      {entries.length === 0 ? (
        <Empty>아직 종료된 대회가 없습니다.</Empty>
      ) : (
        <ul className="space-y-3 px-3">
          {entries.map((e) => (
            <li key={e.tournamentId}>
              <Card className="overflow-hidden">
                <Link href={`/tournaments/${e.tournamentId}`} className="block bg-court px-4 py-2 text-white">
                  <span className="text-xs font-semibold text-white/80">{formatDate(e.date)}</span>
                  <p className="text-lg font-extrabold">{e.title}</p>
                </Link>
                <ul className="divide-y divide-ink/10">
                  {e.groups.map((g) => (
                    <li key={g.groupId} className="px-4 py-3">
                      <p className="text-sm font-extrabold text-court">{g.groupName}</p>
                      <p className="mt-1 text-base">
                        <span className="mr-1">🥇 우승</span> <Names people={g.winners} />
                      </p>
                      <p className="mt-0.5 text-base">
                        <span className="mr-1">🥈 준우승</span> <Names people={g.runnersUp} />
                      </p>
                      {g.third.length > 0 && (
                        <p className="mt-0.5 text-base">
                          <span className="mr-1">🥉 3위</span> <Names people={g.third} />
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

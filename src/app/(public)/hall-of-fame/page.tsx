import { ChevronRight } from "lucide-react";
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
      <PageTitle sub="월례대회 그룹별 우승·준우승·3위">명예의 전당</PageTitle>
      <Suspense fallback={<Loading />}>
        <List searchParams={searchParams} />
      </Suspense>
    </>
  );
}

function Names({ people }: { people: Laureate[] }) {
  return (
    <span className="min-w-0 truncate font-medium">
      {people.map((p, i) => (
        <span key={i}>
          {i > 0 && <span className="text-faint"> · </span>}
          {p.memberId ? (
            <Link href={`/members/${p.memberId}`} className="underline-offset-4 hover:text-primary-text hover:underline">
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

function Row({ icon, label, people }: { icon: string; label: string; people: Laureate[] }) {
  return (
    <p className="flex items-center gap-2 text-[15px]">
      <span className="w-5 shrink-0 text-center" aria-hidden>
        {icon}
      </span>
      <span className="w-12 shrink-0 text-xs text-muted">{label}</span>
      <Names people={people} />
    </p>
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
        <ul className="space-y-3 px-4">
          {entries.map((e) => (
            <li key={e.tournamentId}>
              <Card className="overflow-hidden">
                <Link
                  href={`/tournaments/${e.tournamentId}`}
                  className="group flex items-center justify-between gap-3 border-b border-line px-4 py-3 transition hover:bg-subtle"
                >
                  <div className="min-w-0">
                    <p className="text-xs text-muted">{formatDate(e.date)}</p>
                    <p className="truncate text-base font-semibold">{e.title}</p>
                  </div>
                  <ChevronRight className="size-5 shrink-0 text-faint transition group-hover:translate-x-0.5" aria-hidden />
                </Link>
                <ul className="divide-y divide-line">
                  {e.groups.map((g) => (
                    <li key={g.groupId} className="space-y-1.5 px-4 py-3">
                      <p className="text-xs font-semibold text-primary-text">{g.groupName}</p>
                      <Row icon="🥇" label="우승" people={g.winners} />
                      <Row icon="🥈" label="준우승" people={g.runnersUp} />
                      {g.third.length > 0 && <Row icon="🥉" label="3위" people={g.third} />}
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

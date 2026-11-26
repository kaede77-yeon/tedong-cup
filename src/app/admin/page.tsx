import Link from "next/link";
import { Suspense } from "react";
import { Card, Empty, formatDate, Loading, PageTitle, StatusBadge } from "@/components/ui";
import { load } from "@/server/page";
import { listTournaments } from "@/server/repo";
import { NewTournamentForm } from "./NewTournamentForm";

export const metadata = { title: "대회 운영" };

export default function AdminHome() {
  return (
    <>
      <PageTitle>대회 운영</PageTitle>
      <div className="px-4 pb-4">
        <NewTournamentForm />
      </div>
      <Suspense fallback={<Loading />}>
        <List />
      </Suspense>
    </>
  );
}

async function List() {
  const list = await load(() => listTournaments());
  if (list.length === 0) return <Empty>대회를 먼저 만들어 주세요.</Empty>;
  return (
    <ul className="space-y-2 px-3">
      {list.map((t) => (
        <li key={t.id}>
          <Link href={`/admin/tournaments/${t.id}`} className="block active:opacity-70">
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-muted">{formatDate(t.date)}</span>
                <StatusBadge status={t.status} />
              </div>
              <p className="mt-1 text-lg font-extrabold">{t.title}</p>
              <p className="text-sm font-medium text-muted">
                {t.groups.length === 0 ? "그룹 없음 — 눌러서 그룹 만들기" : t.groups.map((g) => `${g.name} ${g.size}명`).join(" · ")}
              </p>
            </Card>
          </Link>
        </li>
      ))}
    </ul>
  );
}

import { Suspense } from "react";
import { TournamentCard } from "@/components/TournamentCard";
import { Empty, Loading, PageTitle } from "@/components/ui";
import { load } from "@/server/page";
import { listTournaments } from "@/server/repo";
import { NewTournamentForm } from "./NewTournamentForm";

export const metadata = { title: "대회 운영" };

export default function AdminHome() {
  return (
    <>
      <PageTitle sub="대회를 만들고 그룹·점수·수상자를 관리합니다">대회 운영</PageTitle>
      <div className="px-4 pb-5">
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
    <ul className="space-y-3 px-4">
      {list.map((t) => (
        <li key={t.id}>
          <TournamentCard t={t} href={`/admin/tournaments/${t.id}`} emptyText="그룹 없음 — 눌러서 그룹 만들기" />
        </li>
      ))}
    </ul>
  );
}

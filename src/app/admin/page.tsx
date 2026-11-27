import { Suspense } from "react";
import { Empty, Loading, PageTitle } from "@/components/ui";
import { load } from "@/server/page";
import { listTournaments } from "@/server/repo";
import { AdminTournamentList } from "./AdminTournamentList";
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
  return <AdminTournamentList list={list} />;
}

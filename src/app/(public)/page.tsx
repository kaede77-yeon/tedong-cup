import Link from "next/link";
import { Suspense } from "react";
import { TournamentView } from "@/components/TournamentView";
import { Empty, Loading } from "@/components/ui";
import { load } from "@/server/page";
import { getFeaturedTournamentId, getTournamentDetail } from "@/server/repo";

export default function Home() {
  return (
    <Suspense fallback={<Loading />}>
      <Featured />
    </Suspense>
  );
}

/** 진행 중인 대회(없으면 가장 최근 대회)를 바로 보여준다 */
async function Featured() {
  const detail = await load(async () => {
    const id = await getFeaturedTournamentId();
    return id ? getTournamentDetail(id) : null;
  });
  if (!detail) return <Empty>아직 등록된 대회가 없습니다.</Empty>;
  return (
    <>
      {detail.tournament.status === "COMPLETED" && (
        <p className="bg-gray-100 px-4 py-2 text-sm font-semibold text-muted">
          진행 중인 대회가 없어 최근 대회를 표시합니다.{" "}
          <Link href="/tournaments" className="text-court underline">
            전체 기록
          </Link>
        </p>
      )}
      <TournamentView initial={detail} />
    </>
  );
}

import { Suspense } from "react";
import { NoTournament } from "@/components/NoTournament";
import { TournamentView } from "@/components/TournamentView";
import { Loading } from "@/components/ui";
import { load } from "@/server/page";
import { getFeaturedTournamentId, getTournamentDetail } from "@/server/repo";

export default function Home() {
  return (
    <Suspense fallback={<Loading />}>
      <Featured />
    </Suspense>
  );
}

/** 진행 중인 대회를 바로 보여준다. 없으면 대표 이미지와 안내 문구 */
async function Featured() {
  const detail = await load(async () => {
    const id = await getFeaturedTournamentId();
    return id ? getTournamentDetail(id) : null;
  });
  if (!detail) return <NoTournament />;
  return <TournamentView initial={detail} />;
}

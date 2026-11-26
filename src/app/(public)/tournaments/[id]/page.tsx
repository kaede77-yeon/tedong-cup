import { Suspense } from "react";
import { TournamentView } from "@/components/TournamentView";
import { Loading } from "@/components/ui";
import { load } from "@/server/page";
import { getTournamentDetail } from "@/server/repo";

export default function TournamentPage({ params }: PageProps<"/tournaments/[id]">) {
  return (
    <Suspense fallback={<Loading />}>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: Pick<PageProps<"/tournaments/[id]">, "params">) {
  const { id } = await params;
  const detail = await load(() => getTournamentDetail(id));
  return <TournamentView initial={detail} />;
}

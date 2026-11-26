import { Suspense } from "react";
import { Loading } from "@/components/ui";
import { load } from "@/server/page";
import { getTournamentDetail, listMembers } from "@/server/repo";
import { AdminTournament } from "./AdminTournament";

export default function AdminTournamentPage({ params }: PageProps<"/admin/tournaments/[id]">) {
  return (
    <Suspense fallback={<Loading />}>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: Pick<PageProps<"/admin/tournaments/[id]">, "params">) {
  const { id } = await params;
  const [detail, members] = await load(() => Promise.all([getTournamentDetail(id), listMembers({ activeOnly: true })]));
  return <AdminTournament initial={detail} members={members} />;
}

import type { NextRequest } from "next/server";
import { handle, parseBody, requireAdmin } from "@/server/api";
import { deleteTournament, getTournamentDetail, updateTournament } from "@/server/repo";
import { tournamentPatchSchema } from "@/server/schemas";

/** 대회 상세 (그룹·경기·실시간 순위 포함). 공개 화면 polling 대상 */
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/tournaments/[id]">) {
  const { id } = await ctx.params;
  return handle(() => getTournamentDetail(id));
}

export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/tournaments/[id]">) {
  return handle(async () => {
    requireAdmin(req);
    const { id } = await ctx.params;
    return updateTournament(id, await parseBody(req, tournamentPatchSchema));
  });
}

export async function DELETE(req: NextRequest, ctx: RouteContext<"/api/tournaments/[id]">) {
  return handle(async () => {
    requireAdmin(req);
    const { id } = await ctx.params;
    await deleteTournament(id);
  });
}

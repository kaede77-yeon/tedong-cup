import type { NextRequest } from "next/server";
import { handle, requireAdmin } from "@/server/api";
import { reopenTournament } from "@/server/repo";

/** 종료된 대회 잠금 해제 */
export async function POST(req: NextRequest, ctx: RouteContext<"/api/tournaments/[id]/reopen">) {
  return handle(async () => {
    requireAdmin(req);
    const { id } = await ctx.params;
    return reopenTournament(id);
  });
}

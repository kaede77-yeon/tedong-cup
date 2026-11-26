import type { NextRequest } from "next/server";
import { handle, parseBody, requireAdmin } from "@/server/api";
import { completeTournament } from "@/server/repo";
import { completeSchema } from "@/server/schemas";

/** 대회 종료: 그룹별 우승/준우승 확정 후 잠금 */
export async function POST(req: NextRequest, ctx: RouteContext<"/api/tournaments/[id]/complete">) {
  return handle(async () => {
    requireAdmin(req);
    const { id } = await ctx.params;
    const { awards } = await parseBody(req, completeSchema);
    return completeTournament(id, awards);
  });
}

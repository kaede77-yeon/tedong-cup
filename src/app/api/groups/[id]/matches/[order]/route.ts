import type { NextRequest } from "next/server";
import { handle, parseBody, requireAdmin } from "@/server/api";
import { notFound } from "@/server/errors";
import { setMatchScore } from "@/server/repo";
import { scoreSchema } from "@/server/schemas";

/** 점수 입력/수정. body가 null이면 입력 취소 */
export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/groups/[id]/matches/[order]">) {
  return handle(async () => {
    requireAdmin(req);
    const { id, order } = await ctx.params;
    const n = Number(order);
    if (!Number.isInteger(n)) throw notFound("경기");
    return setMatchScore(id, n, await parseBody(req, scoreSchema));
  });
}

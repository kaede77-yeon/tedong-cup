import type { NextRequest } from "next/server";
import { handle, parseBody, requireAdmin } from "@/server/api";
import { createGroup } from "@/server/repo";
import { groupCreateSchema } from "@/server/schemas";

/** 그룹 생성: 참가자 순번 무작위 배정 + 대진표 생성 */
export async function POST(req: NextRequest, ctx: RouteContext<"/api/tournaments/[id]/groups">) {
  return handle(async () => {
    requireAdmin(req);
    const { id } = await ctx.params;
    return createGroup(id, await parseBody(req, groupCreateSchema));
  }, 201);
}

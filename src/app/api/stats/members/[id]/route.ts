import type { NextRequest } from "next/server";
import { handle } from "@/server/api";
import { getMemberDetail } from "@/server/repo";

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/stats/members/[id]">) {
  const { id } = await ctx.params;
  return handle(() => getMemberDetail(id));
}

import type { NextRequest } from "next/server";
import { handle, requireAdmin } from "@/server/api";
import { deleteGroup } from "@/server/repo";

export async function DELETE(req: NextRequest, ctx: RouteContext<"/api/groups/[id]">) {
  return handle(async () => {
    requireAdmin(req);
    const { id } = await ctx.params;
    await deleteGroup(id);
  });
}

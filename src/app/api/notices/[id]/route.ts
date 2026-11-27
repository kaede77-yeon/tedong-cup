import type { NextRequest } from "next/server";
import { handle, parseBody, requireAdmin } from "@/server/api";
import { deleteNotice, updateNotice } from "@/server/repo";
import { noticePatchSchema } from "@/server/schemas";

export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/notices/[id]">) {
  return handle(async () => {
    requireAdmin(req);
    const { id } = await ctx.params;
    return updateNotice(id, await parseBody(req, noticePatchSchema));
  });
}

export async function DELETE(req: NextRequest, ctx: RouteContext<"/api/notices/[id]">) {
  return handle(async () => {
    requireAdmin(req);
    const { id } = await ctx.params;
    await deleteNotice(id);
  });
}

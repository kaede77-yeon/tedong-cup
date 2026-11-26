import type { NextRequest } from "next/server";
import { handle, parseBody, requireAdmin } from "@/server/api";
import { deleteMember, updateMember } from "@/server/repo";
import { memberPatchSchema } from "@/server/schemas";

export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/members/[id]">) {
  return handle(async () => {
    requireAdmin(req);
    const { id } = await ctx.params;
    return updateMember(id, await parseBody(req, memberPatchSchema));
  });
}

export async function DELETE(req: NextRequest, ctx: RouteContext<"/api/members/[id]">) {
  return handle(async () => {
    requireAdmin(req);
    const { id } = await ctx.params;
    await deleteMember(id);
  });
}

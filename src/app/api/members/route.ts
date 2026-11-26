import type { NextRequest } from "next/server";
import { handle, parseBody, requireAdmin } from "@/server/api";
import { createMember, listMembers } from "@/server/repo";
import { memberCreateSchema } from "@/server/schemas";

export async function GET(req: NextRequest) {
  const activeOnly = req.nextUrl.searchParams.get("active") === "1";
  return handle(() => listMembers({ activeOnly }));
}

export async function POST(req: NextRequest) {
  return handle(async () => {
    requireAdmin(req);
    return createMember(await parseBody(req, memberCreateSchema));
  }, 201);
}

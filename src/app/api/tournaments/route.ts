import type { NextRequest } from "next/server";
import { handle, parseBody, requireAdmin } from "@/server/api";
import { createTournament, listTournaments } from "@/server/repo";
import { tournamentCreateSchema } from "@/server/schemas";

export async function GET(req: NextRequest) {
  const year = Number(req.nextUrl.searchParams.get("year")) || undefined;
  return handle(() => listTournaments({ year }));
}

export async function POST(req: NextRequest) {
  return handle(async () => {
    requireAdmin(req);
    return createTournament(await parseBody(req, tournamentCreateSchema));
  }, 201);
}

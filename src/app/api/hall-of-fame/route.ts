import type { NextRequest } from "next/server";
import { handle } from "@/server/api";
import { getHallOfFame } from "@/server/repo";

export async function GET(req: NextRequest) {
  const year = Number(req.nextUrl.searchParams.get("year")) || undefined;
  return handle(() => getHallOfFame(year));
}

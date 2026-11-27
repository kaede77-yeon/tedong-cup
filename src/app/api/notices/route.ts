import type { NextRequest } from "next/server";
import { handle, parseBody, requireAdmin } from "@/server/api";
import { createNotice, listNotices } from "@/server/repo";
import { noticeCreateSchema } from "@/server/schemas";

/** 공지사항 목록 (최신순, 공개) */
export async function GET() {
  return handle(() => listNotices());
}

export async function POST(req: NextRequest) {
  return handle(async () => {
    requireAdmin(req);
    return createNotice(await parseBody(req, noticeCreateSchema));
  }, 201);
}

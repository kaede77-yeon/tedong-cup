import "server-only";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { SESSION_COOKIE, verifySessionToken } from "./auth";
import { HttpError } from "./errors";

/** 쓰기 API 공통 인증 (proxy.ts에 더한 2차 방어) */
export function requireAdmin(req: NextRequest): void {
  if (!verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value)) {
    throw new HttpError(401, "관리자 인증이 필요합니다.");
  }
}

export async function parseBody<S extends z.ZodType>(req: NextRequest, schema: S): Promise<z.infer<S>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new HttpError(400, "요청 본문이 올바른 JSON이 아닙니다.");
  }
  const r = schema.safeParse(raw);
  if (!r.success) throw new HttpError(400, r.error.issues[0]?.message ?? "입력값이 올바르지 않습니다.");
  return r.data;
}

/** 핸들러 래퍼: HttpError → JSON 응답, 그 외 → 500 */
export async function handle(fn: () => Promise<unknown>, status = 200): Promise<Response> {
  try {
    const data = await fn();
    return data === undefined ? new Response(null, { status: 204 }) : Response.json(data, { status });
  } catch (e) {
    if (e instanceof HttpError) return Response.json({ error: e.message }, { status: e.status });
    console.error(e);
    return Response.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}


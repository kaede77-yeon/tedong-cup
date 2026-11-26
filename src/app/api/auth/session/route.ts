import { NextResponse, type NextRequest } from "next/server";
import { handle, parseBody } from "@/server/api";
import { checkPassword, createSessionToken, SESSION_COOKIE, sessionCookieOptions, verifySessionToken } from "@/server/auth";
import { HttpError } from "@/server/errors";
import { loginSchema } from "@/server/schemas";

/** 로그인 상태 확인 */
export async function GET(req: NextRequest) {
  return Response.json({ admin: verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value) });
}

/** 로그인: 비밀번호 확인 후 서명 쿠키 발급 */
export async function POST(req: NextRequest) {
  let ok = false;
  const res = await handle(async () => {
    const { password } = await parseBody(req, loginSchema);
    if (!checkPassword(password)) {
      // 무차별 대입 완화: 실패 시 응답 지연
      await new Promise((r) => setTimeout(r, 800));
      throw new HttpError(401, "비밀번호가 올바르지 않습니다.");
    }
    ok = true;
    return { admin: true };
  });
  if (!ok) return res;
  const out = NextResponse.json({ admin: true });
  out.cookies.set(SESSION_COOKIE, createSessionToken(), sessionCookieOptions);
  return out;
}

/** 로그아웃 */
export async function DELETE() {
  const out = new NextResponse(null, { status: 204 });
  out.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOptions, maxAge: 0 });
  return out;
}

import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/server/auth";

/**
 * 관리자 보호 (1차 방어). 각 쓰기 Route Handler도 requireAdmin()으로 다시 검증한다.
 * - /api/** 의 쓰기(POST/PATCH/PUT/DELETE): 로그인 API를 제외하고 401
 * - /admin/** 페이지: 로그인 페이지를 제외하고 /admin/login 으로 리다이렉트
 */
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const authed = verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value);

  if (pathname.startsWith("/api/")) {
    const isWrite = req.method !== "GET" && req.method !== "HEAD";
    if (isWrite && pathname !== "/api/auth/session" && !authed) {
      return Response.json({ error: "관리자 인증이 필요합니다." }, { status: 401 });
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/admin") && pathname !== "/admin/login" && !authed) {
    const url = new URL("/admin/login", req.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*", "/admin/:path*"],
};

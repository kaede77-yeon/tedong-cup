import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "./env";

export const SESSION_COOKIE = "tedong_admin";
export const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 7; // 7일

function sign(payload: string): string {
  return createHmac("sha256", env.sessionSecret).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** 관리자 비밀번호 비교 (타이밍 공격 방지를 위해 해시 후 상수 시간 비교) */
export function checkPassword(input: string): boolean {
  const h = (s: string) => createHmac("sha256", "pw").update(s).digest("hex");
  return safeEqual(h(input), h(env.adminPassword));
}

/** 세션 토큰: `admin.<만료epoch초>.<서명>` */
export function createSessionToken(now = Date.now()): string {
  const payload = `admin.${Math.floor(now / 1000) + SESSION_MAX_AGE_SEC}`;
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: string | undefined, now = Date.now()): boolean {
  if (!token) return false;
  const i = token.lastIndexOf(".");
  if (i < 0) return false;
  const payload = token.slice(0, i);
  const sig = token.slice(i + 1);
  if (!safeEqual(sig, sign(payload))) return false;
  const [role, exp] = payload.split(".");
  return role === "admin" && Number(exp) * 1000 > now;
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/",
  maxAge: SESSION_MAX_AGE_SEC,
};

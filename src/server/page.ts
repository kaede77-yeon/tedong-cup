import "server-only";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { HttpError } from "./errors";

/**
 * 서버 컴포넌트용 데이터 로더.
 * cacheComponents 하에서 요청 시점 데이터임을 명시(connection)하고, 404 도메인 에러는 notFound()로 변환한다.
 * 반드시 <Suspense> 경계 안의 컴포넌트에서 호출해야 한다.
 */
export async function load<T>(fn: () => Promise<T>): Promise<T> {
  await connection();
  try {
    return await fn();
  } catch (e) {
    if (e instanceof HttpError && e.status === 404) notFound();
    throw e;
  }
}

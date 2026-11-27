import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { SITE_THEME_TAG, type SiteTheme } from "@/lib/theme";
import { getSiteTheme } from "./repo";

/**
 * 루트 레이아웃용 테마 조회. 정적 셸에 포함되도록 캐시하고(첫 화면부터 깜빡임 없음),
 * 관리자가 바꾸면 PATCH /api/settings 에서 태그를 즉시 무효화한다.
 * DB 오류 시에는 기본 테마로 표시한다 (최대 1시간 뒤 자동 재조회).
 */
export async function getCachedSiteTheme(): Promise<SiteTheme> {
  "use cache";
  cacheTag(SITE_THEME_TAG);
  cacheLife("hours");
  try {
    return await getSiteTheme();
  } catch (e) {
    console.error("테마 조회 실패, 기본 테마 사용", e);
    return "default";
  }
}

// 사이트 테마 (관리자가 선택, 모든 사용자에게 적용)

export const SITE_THEMES = ["default", "nike"] as const;
export type SiteTheme = (typeof SITE_THEMES)[number];

export const SITE_THEME_LABEL: Record<SiteTheme, string> = {
  default: "기본",
  nike: "나이키 테마",
};

/** 테마 캐시 태그 (변경 시 revalidateTag로 즉시 무효화) */
export const SITE_THEME_TAG = "site-theme";

import { revalidateTag } from "next/cache";
import type { NextRequest } from "next/server";
import { SITE_THEME_TAG } from "@/lib/theme";
import { handle, parseBody, requireAdmin } from "@/server/api";
import { getSiteTheme, setSiteTheme } from "@/server/repo";
import { settingsPatchSchema } from "@/server/schemas";

/** 사이트 설정 조회 (공개) */
export async function GET() {
  return handle(async () => ({ theme: await getSiteTheme() }));
}

/** 사이트 테마 변경 (관리자). 캐시된 테마를 즉시 만료시켜 다음 요청부터 반영 */
export async function PATCH(req: NextRequest) {
  return handle(async () => {
    requireAdmin(req);
    const { theme } = await parseBody(req, settingsPatchSchema);
    const result = await setSiteTheme(theme);
    revalidateTag(SITE_THEME_TAG, { expire: 0 });
    return result;
  });
}

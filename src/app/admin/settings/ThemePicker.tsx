"use client";

import { AlertTriangle, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Notice } from "@/components/ui";
import { api } from "@/lib/client";
import { SITE_THEME_LABEL, SITE_THEMES, type SiteTheme } from "@/lib/theme";

const DESCRIPTION: Record<SiteTheme, string> = {
  default: "인디고 포인트 색, 둥근 카드와 은은한 그림자",
  nike: "검정·흰색 위주, 알약 모양 버튼, 각진 카드, 그림자 없음",
};

/**
 * 테마 미리보기. data-theme 를 지정한 영역 안에서는 해당 테마의 토큰이 적용되므로
 * 실제 부품 모양(카드·버튼·탭)을 그대로 축소해서 보여줄 수 있다.
 */
function Preview({ theme }: { theme: SiteTheme }) {
  return (
    <div data-theme={theme} className="pointer-events-none bg-bg p-3 text-ink" aria-hidden>
      <div className="grid grid-cols-2 rounded-tab bg-subtle p-0.5 text-xs font-semibold">
        <span className="rounded-tab-item bg-tab-on py-1 text-center text-tab-on-fg shadow-sm">대진표</span>
        <span className="py-1 text-center text-muted">순위표</span>
      </div>
      <div className="mt-2 rounded-card border border-line bg-surface px-3 py-2 shadow-xs">
        <span className="rounded-full border border-primary/20 bg-primary-soft px-2 text-[11px] font-semibold text-primary-text">
          게임 1
        </span>
        <div className="mt-1 flex items-center justify-between text-sm">
          <span className="font-semibold">김테니 · 박동회</span>
          <span className="tabular text-lg font-bold text-primary-text">6</span>
        </div>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-1.5 text-xs font-semibold">
        <span className="rounded-btn bg-primary py-2 text-center text-primary-fg shadow-sm">저장</span>
        <span className="rounded-btn border border-btn2-line bg-btn2 py-2 text-center shadow-xs">취소</span>
      </div>
    </div>
  );
}

/** 서버 반영(router.refresh) 전에 현재 화면의 테마를 바로 바꾼다 */
function applyThemeNow(theme: SiteTheme) {
  document.documentElement.setAttribute("data-theme", theme);
}

export function ThemePicker({ initial }: { initial: SiteTheme }) {
  const router = useRouter();
  const [theme, setTheme] = useState<SiteTheme>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function choose(next: SiteTheme) {
    if (next === theme || busy) return;
    const prev = theme;
    setBusy(true);
    setError(null);
    setTheme(next);
    applyThemeNow(next); // 관리자 화면에 즉시 반영
    try {
      await api("/api/settings", "PATCH", { theme: next });
      router.refresh();
    } catch (e) {
      setTheme(prev);
      applyThemeNow(prev);
      setError(e instanceof Error ? e.message : "변경 실패");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3 px-4">
      {error && (
        <Notice tone="danger">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          {error}
        </Notice>
      )}
      <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="화면 테마">
        {SITE_THEMES.map((t) => {
          const on = t === theme;
          return (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={busy}
              onClick={() => choose(t)}
              className={`overflow-hidden rounded-card border-2 bg-surface text-left transition active:scale-[0.99] disabled:opacity-70 ${
                on ? "border-primary" : "border-line"
              }`}
            >
              <Preview theme={t} />
              <div className="border-t border-line p-3">
                <p className="flex items-center gap-1.5 text-base font-semibold">
                  {on && <Check className="size-4 shrink-0" strokeWidth={3} />}
                  {SITE_THEME_LABEL[t]}
                </p>
                <p className="mt-0.5 text-xs leading-snug text-muted">{DESCRIPTION[t]}</p>
              </div>
            </button>
          );
        })}
      </div>
      <p className="px-1 text-xs text-muted">라이트/다크 모드는 각 기기의 설정을 따릅니다.</p>
    </div>
  );
}

"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";

/** 하단 시트 공통 레이아웃: 오버레이 · 핸들 · 제목 · 본문 · 하단 고정 액션 */
export function Sheet({
  label,
  title,
  description,
  onClose,
  footer,
  children,
}: {
  label: string;
  title: ReactNode;
  description?: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-[2px]" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className="flex max-h-[92dvh] w-full max-w-[480px] flex-col rounded-t-3xl border-t border-line bg-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-line-strong" />
        <div className="flex shrink-0 items-start justify-between gap-3 px-5 pt-3 pb-1">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
            {description && <div className="mt-1 text-sm text-muted">{description}</div>}
          </div>
          <button
            onClick={onClose}
            className="-mr-2 grid size-10 shrink-0 place-items-center rounded-full text-muted transition hover:bg-subtle hover:text-ink"
            aria-label="닫기"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-3">{children}</div>
        {footer && (
          <div className="shrink-0 border-t border-line px-5 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">{footer}</div>
        )}
      </div>
    </div>
  );
}

/** 시트 본문의 단계 라벨 */
export function StepLabel({ n, children }: { n?: number; children: ReactNode }) {
  return (
    <p className="mb-2 flex items-center gap-2 text-sm font-medium text-muted">
      {n !== undefined && (
        <span className="grid size-5 place-items-center rounded-full bg-primary-soft text-[13px] font-semibold text-primary-text">
          {n}
        </span>
      )}
      {children}
    </p>
  );
}

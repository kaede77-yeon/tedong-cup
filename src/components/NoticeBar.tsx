"use client";

import { ChevronLeft, ChevronRight, Megaphone } from "lucide-react";
import { useState } from "react";
import type { NoticeItem } from "@/lib/types";
import { Sheet } from "./Sheet";
import { Button } from "./ui";

/** 공지 날짜 표기 (서버·클라이언트 렌더 결과가 같도록 시간대 고정) */
export function formatNoticeDate(iso: string) {
  return new Date(iso)
    .toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" })
    .replace(/\.\s?/g, ".")
    .replace(/\.$/, "");
}

/**
 * 사용자 화면 상단 한줄 공지 (최신순 목록의 첫 번째 글).
 * 누르면 하단 시트로 전체 내용을 보여주고, 2개 이상이면 이전글/다음글로 이동할 수 있다.
 */
export function NoticeBar({ notices }: { notices: NoticeItem[] }) {
  const [index, setIndex] = useState<number | null>(null); // 시트에서 보고 있는 글 (null = 닫힘)
  const latest = notices[0];
  const current = index === null ? null : notices[index];
  const multi = notices.length > 1;

  return (
    <>
      {/* id는 NoTournament가 :has()로 위치를 보정하는 데 사용 */}
      <button
        id="notice-bar"
        type="button"
        onClick={() => setIndex(0)}
        className="flex h-8 w-full items-center gap-2 border-b border-line bg-primary-soft px-4 text-left text-primary-text transition active:bg-primary-soft/70"
        aria-label={`공지사항: ${latest.title} (눌러서 전체 보기)`}
      >
        <Megaphone className="size-4 shrink-0" aria-hidden />
        <span className="min-w-0 flex-1 truncate text-sm font-semibold">{latest.title}</span>
        <ChevronRight className="size-4 shrink-0 opacity-70" aria-hidden />
      </button>

      {current && index !== null && (
        <Sheet
          key={current.id} // 글이 바뀌면 본문 스크롤을 맨 위로
          label="공지사항"
          title={current.title}
          description={
            <>
              공지사항 · {formatNoticeDate(current.updatedAt)}
              {multi && (
                <span className="tabular ml-1.5 text-faint">
                  ({index + 1}/{notices.length})
                </span>
              )}
            </>
          }
          onClose={() => setIndex(null)}
          footer={
            multi ? (
              <div className="grid grid-cols-2 gap-2">
                <Button variant="secondary" disabled={index === 0} onClick={() => setIndex(index - 1)}>
                  <ChevronLeft className="size-4" />
                  이전글
                </Button>
                <Button variant="secondary" disabled={index === notices.length - 1} onClick={() => setIndex(index + 1)}>
                  다음글
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            ) : (
              <Button variant="secondary" className="w-full" onClick={() => setIndex(null)}>
                닫기
              </Button>
            )
          }
        >
          <div>
            {current.content ? (
              <p className="text-[15px] leading-relaxed break-words whitespace-pre-wrap text-ink">{current.content}</p>
            ) : (
              <p className="text-sm text-muted">추가 내용이 없습니다.</p>
            )}

            {multi && index < notices.length - 1 && (
              <button
                type="button"
                onClick={() => setIndex(index + 1)}
                className="mt-5 flex min-h-11 w-full items-center gap-2 rounded-xl border border-line bg-subtle px-3.5 text-left transition hover:border-line-strong"
              >
                <span className="shrink-0 text-xs font-semibold text-muted">다음글</span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{notices[index + 1].title}</span>
                <ChevronRight className="size-4 shrink-0 text-faint" aria-hidden />
              </button>
            )}
          </div>
        </Sheet>
      )}
    </>
  );
}

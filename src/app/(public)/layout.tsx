import { Suspense } from "react";
import { BottomNav, NavBar } from "@/components/BottomNav";
import { NoticeBar } from "@/components/NoticeBar";
import { load } from "@/server/page";
import { listNotices } from "@/server/repo";

/** 공개(회원) 화면 공통 레이아웃: 상단 한줄 공지 + 하단 탭바 */
export default function PublicLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <Suspense fallback={null}>
        <LatestNotice />
      </Suspense>
      <div className="pb-24">{children}</div>
      <Suspense fallback={<NavBar pathname={null} />}>
        <BottomNav />
      </Suspense>
    </>
  );
}

/** 최신 공지를 한 줄로 표시하고, 전체 목록은 상세 시트의 이전/다음글 이동에 사용 (없으면 표시하지 않음) */
async function LatestNotice() {
  const notices = await load(() => listNotices());
  return notices.length > 0 ? <NoticeBar notices={notices} /> : null;
}

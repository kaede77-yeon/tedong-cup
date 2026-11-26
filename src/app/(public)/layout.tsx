import { Suspense } from "react";
import { BottomNav, NavBar } from "@/components/BottomNav";

/** 공개(회원) 화면 공통 레이아웃: 하단 탭바 */
export default function PublicLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <div className="pb-24">{children}</div>
      <Suspense fallback={<NavBar pathname={null} />}>
        <BottomNav />
      </Suspense>
    </>
  );
}

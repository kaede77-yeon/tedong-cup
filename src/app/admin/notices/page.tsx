import { Suspense } from "react";
import { Loading, PageTitle } from "@/components/ui";
import { load } from "@/server/page";
import { listNotices } from "@/server/repo";
import { NoticeManager } from "./NoticeManager";

export const metadata = { title: "공지사항" };

export default function AdminNoticesPage() {
  return (
    <>
      <PageTitle sub="가장 최근에 작성한 공지 1건이 사용자 화면 상단에 한 줄로 표시됩니다.">공지사항</PageTitle>
      <Suspense fallback={<Loading />}>
        <Content />
      </Suspense>
    </>
  );
}

async function Content() {
  const notices = await load(() => listNotices());
  return <NoticeManager initial={notices} />;
}

import { Suspense } from "react";
import { Loading, PageTitle } from "@/components/ui";
import { load } from "@/server/page";
import { listMembers } from "@/server/repo";
import { MemberManager } from "./MemberManager";

export const metadata = { title: "회원 명부" };

export default function AdminMembersPage() {
  return (
    <>
      <PageTitle sub="동명이인은 닉네임으로 구분합니다. 기록이 있는 회원은 삭제 대신 비활성화하세요.">회원 명부</PageTitle>
      <Suspense fallback={<Loading />}>
        <Content />
      </Suspense>
    </>
  );
}

async function Content() {
  const members = await load(() => listMembers());
  return <MemberManager initial={members} />;
}

import { Suspense } from "react";
import { PageTitle } from "@/components/ui";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "관리자 로그인" };

export default function LoginPage() {
  return (
    <>
      <PageTitle sub="운영진 전용입니다. 회원은 로그인 없이 모든 기록을 볼 수 있어요.">관리자 로그인</PageTitle>
      <Suspense>
        <LoginForm />
      </Suspense>
    </>
  );
}

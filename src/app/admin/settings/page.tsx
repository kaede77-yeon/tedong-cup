import { Suspense } from "react";
import { Loading, PageTitle } from "@/components/ui";
import { load } from "@/server/page";
import { getSiteTheme } from "@/server/repo";
import { ThemePicker } from "./ThemePicker";

export const metadata = { title: "화면 테마" };

export default function AdminSettingsPage() {
  return (
    <>
      <PageTitle sub="선택한 테마는 모든 회원의 화면에 바로 적용됩니다.">화면 테마</PageTitle>
      <Suspense fallback={<Loading />}>
        <Content />
      </Suspense>
    </>
  );
}

async function Content() {
  const theme = await load(() => getSiteTheme());
  return <ThemePicker initial={theme} />;
}

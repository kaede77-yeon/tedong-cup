import Link from "next/link";
import { Suspense } from "react";
import { LogoutButton } from "./LogoutButton";

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div>
      <nav className="flex items-center gap-1 border-b-2 border-ink/10 bg-court-light px-2">
        <Link href="/admin" className="rounded-lg px-3 py-3 text-sm font-extrabold">
          대회 운영
        </Link>
        <Link href="/admin/members" className="rounded-lg px-3 py-3 text-sm font-extrabold">
          회원 명부
        </Link>
        <span className="flex-1" />
        <Suspense>
          <LogoutButton />
        </Suspense>
      </nav>
      {children}
    </div>
  );
}

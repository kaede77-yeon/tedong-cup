import { Suspense } from "react";
import { AdminNav, AdminNavFallback } from "./AdminNav";

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div>
      <Suspense fallback={<AdminNavFallback />}>
        <AdminNav />
      </Suspense>
      {children}
    </div>
  );
}

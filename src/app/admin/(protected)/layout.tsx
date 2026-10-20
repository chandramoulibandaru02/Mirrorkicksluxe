import Link from "next/link";
import { requireAdminPage } from "@/lib/server/session";
import { SITE_NAME } from "@/lib/brand";
import { AdminNav } from "@/components/admin/admin-nav";

export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  const s = await requireAdminPage();
  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <aside className="bg-ink text-white md:w-56 md:shrink-0">
        <div className="flex items-center justify-between px-4 py-3 md:block">
          <p className="font-bold">{SITE_NAME}</p>
          <p className="hidden truncate text-xs text-white/70 md:block">{s.email}</p>
          <Link href="/" className="text-xs text-white/80 underline md:hidden">View store</Link>
        </div>
        <AdminNav />
      </aside>
      <div className="min-w-0 flex-1 p-4 sm:p-6">{children}</div>
    </div>
  );
}

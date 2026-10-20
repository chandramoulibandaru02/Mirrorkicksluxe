"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";

const LINKS = [
  { href: "/admin", label: "Dashboard", exact: true },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/pages", label: "Pages" },
  { href: "/admin/settings", label: "Settings" },
];

export function AdminNav() {
  const path = usePathname();
  const router = useRouter();
  const { signOut } = useAuth();
  return (
    <nav aria-label="Administration" className="flex gap-1 overflow-x-auto px-2 pb-2 md:flex-col md:overflow-visible md:pb-4">
      {LINKS.map((l) => {
        const active = l.exact ? path === l.href : path.startsWith(l.href);
        return (
          <Link key={l.href} href={l.href} aria-current={active ? "page" : undefined} className={`flex min-h-10 shrink-0 items-center rounded-[3px] px-3 text-sm ${active ? "bg-white/15 font-semibold" : "hover:bg-white/10"}`}>
            {l.label}
          </Link>
        );
      })}
      <Link href="/" className="hidden min-h-10 items-center rounded-[3px] px-3 text-sm text-white/80 hover:bg-white/10 md:flex">View store</Link>
      <button type="button" onClick={async () => { await signOut(); router.replace("/admin/login"); }} className="flex min-h-10 shrink-0 items-center rounded-[3px] px-3 text-left text-sm text-white/80 hover:bg-white/10">
        Sign out
      </button>
    </nav>
  );
}

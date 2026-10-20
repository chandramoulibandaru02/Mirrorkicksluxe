import type { Metadata } from "next";
import Link from "next/link";
import { AccountForm } from "@/components/account-form";
import { requireUserPage } from "@/lib/server/session";

export const metadata: Metadata = { title: "My account", robots: { index: false } };

export default async function AccountPage() {
  await requireUserPage("/account");
  return (
    <div className="container-x max-w-3xl py-4 sm:py-6">
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-xl font-bold">My account</h1>
        <Link href="/account/orders" className="btn btn-outline btn-sm">Your orders</Link>
      </div>
      <AccountForm />
    </div>
  );
}

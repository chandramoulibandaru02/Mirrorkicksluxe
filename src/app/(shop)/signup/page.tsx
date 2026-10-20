import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignupForm, safeNext } from "@/components/auth-forms";
import { getSession } from "@/lib/server/session";

export const metadata: Metadata = { title: "Create account", robots: { index: false } };

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  if (await getSession()) redirect(safeNext(next));
  return <SignupForm next={next} />;
}

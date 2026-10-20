import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm, safeNext } from "@/components/auth-forms";
import { getSession } from "@/lib/server/session";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  if (await getSession()) redirect(safeNext(next));
  return <LoginForm next={next} />;
}

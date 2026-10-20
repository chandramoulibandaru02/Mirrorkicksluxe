import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/session";

export async function GET() {
  const s = await getSession().catch(() => null);
  return NextResponse.json({ user: s ? { uid: s.uid, email: s.email, name: s.name, isAdmin: s.isAdmin } : null });
}

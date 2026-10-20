import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { adminAuth } from "./firebase-admin";
import { HttpError } from "./http";

export const SESSION_COOKIE = "session";
export const SESSION_MAX_AGE_MS = 5 * 24 * 60 * 60 * 1000;

export interface Session {
  uid: string;
  email: string;
  name: string;
  isAdmin: boolean;
}

export async function verifySessionValue(value: string | undefined): Promise<Session | null> {
  if (!value) return null;
  try {
    // checkRevoked=true: disabled users and revoked sessions are rejected server-side.
    const d = await adminAuth().verifySessionCookie(value, true);
    return {
      uid: d.uid,
      email: d.email ?? "",
      name: (d.name as string | undefined) ?? "",
      // Admin status comes ONLY from a custom claim that can be set solely with the Admin SDK.
      isAdmin: d.admin === true,
    };
  } catch {
    return null;
  }
}

export const getSession = cache(async (): Promise<Session | null> => {
  const jar = await cookies();
  return verifySessionValue(jar.get(SESSION_COOKIE)?.value);
});

/** For route handlers: returns the session or throws 401. */
export async function requireUser(): Promise<Session> {
  const s = await getSession();
  if (!s) throw new HttpError(401, "Please sign in to continue.");
  return s;
}

/** For route handlers: returns the admin session or throws 401/403. */
export async function requireAdmin(): Promise<Session> {
  const s = await getSession();
  if (!s) throw new HttpError(401, "Administrator sign-in required.");
  if (!s.isAdmin) throw new HttpError(403, "You are not authorised to perform this action.");
  return s;
}

/** For server components/layouts: redirect instead of throwing. */
export async function requireUserPage(next: string): Promise<Session> {
  const s = await getSession();
  if (!s) redirect(`/login?next=${encodeURIComponent(next)}`);
  return s;
}

export async function requireAdminPage(): Promise<Session> {
  const s = await getSession();
  if (!s || !s.isAdmin) redirect("/admin/login");
  return s;
}

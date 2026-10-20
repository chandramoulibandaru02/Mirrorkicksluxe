import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/server/firebase-admin";
import { handle, HttpError, readJson, assertSameOrigin } from "@/lib/server/http";
import { SESSION_COOKIE, SESSION_MAX_AGE_MS } from "@/lib/server/session";

const body = z.object({ idToken: z.string().min(20).max(4000), name: z.string().trim().max(80).optional() });

export const POST = handle(async (req: Request) => {
  const { idToken, name } = body.parse(await readJson(req));
  const auth = adminAuth();
  let decoded;
  try {
    decoded = await auth.verifyIdToken(idToken, true);
  } catch {
    throw new HttpError(401, "Sign-in could not be verified. Please try again.");
  }
  // Session cookies can only be minted from a token issued by a recent sign-in.
  if (Date.now() / 1000 - decoded.auth_time > 5 * 60) throw new HttpError(401, "Please sign in again.");

  const cookie = await auth.createSessionCookie(idToken, { expiresIn: SESSION_MAX_AGE_MS });

  // Profile document: only name/email are written here. Roles are NEVER taken from the client.
  const userRef = adminDb().collection("users").doc(decoded.uid);
  const snap = await userRef.get();
  if (!snap.exists) {
    await userRef.set({
      name: name || decoded.name || "",
      email: decoded.email ?? "",
      phone: "",
      addresses: [],
      createdAt: FieldValue.serverTimestamp(),
    });
  }

  const jar = await cookies();
  jar.set(SESSION_COOKIE, cookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_MS / 1000,
  });
  return NextResponse.json({ ok: true, isAdmin: decoded.admin === true });
});

export const DELETE = handle(async (req: Request) => {
  assertSameOrigin(req);
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  return NextResponse.json({ ok: true });
});

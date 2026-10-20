"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { createUserWithEmailAndPassword, sendPasswordResetEmail, signInWithEmailAndPassword, signOut as fbSignOut, updateProfile } from "firebase/auth";
import { clientAuth, isFirebaseClientConfigured } from "@/lib/firebase/client";

export interface AuthUser {
  uid: string;
  email: string;
  name: string;
  isAdmin: boolean;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<AuthUser>;
  signUp: (name: string, email: string, password: string) => Promise<AuthUser>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const Ctx = createContext<AuthContextValue | null>(null);

export function friendlyAuthError(e: unknown): string {
  const code = (e as { code?: string })?.code ?? "";
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
    case "auth/invalid-email":
      return "Incorrect email or password.";
    case "auth/email-already-in-use":
      return "An account with this email already exists. Try signing in instead.";
    case "auth/weak-password":
      return "Choose a stronger password (at least 6 characters).";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a few minutes and try again.";
    case "auth/network-request-failed":
      return "Network error. Check your connection and try again.";
    case "auth/user-disabled":
      return "This account has been disabled.";
    default:
      return (e as Error)?.message && !code ? (e as Error).message : "Something went wrong. Please try again.";
  }
}

async function mintSession(idToken: string, name?: string): Promise<AuthUser> {
  const res = await fetch("/api/auth/session", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ idToken, name }) });
  if (!res.ok) throw new Error(((await res.json().catch(() => null)) as { error?: string } | null)?.error ?? "Could not start your session.");
  const me = await (await fetch("/api/auth/me", { cache: "no-store" })).json();
  if (!me.user) throw new Error("Could not start your session.");
  return me.user as AuthUser;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => live && setUser(d.user))
      .catch(() => undefined)
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, []);

  const requireConfigured = () => {
    if (!isFirebaseClientConfigured) throw new Error("Sign-in is not configured for this site yet.");
  };

  const signIn = useCallback(async (email: string, password: string) => {
    requireConfigured();
    const cred = await signInWithEmailAndPassword(clientAuth(), email.trim(), password);
    const u = await mintSession(await cred.user.getIdToken());
    setUser(u);
    return u;
  }, []);

  const signUp = useCallback(async (name: string, email: string, password: string) => {
    requireConfigured();
    const cred = await createUserWithEmailAndPassword(clientAuth(), email.trim(), password);
    await updateProfile(cred.user, { displayName: name.trim() });
    const u = await mintSession(await cred.user.getIdToken(true), name.trim());
    setUser(u);
    return u;
  }, []);

  const signOut = useCallback(async () => {
    await fetch("/api/auth/session", { method: "DELETE" }).catch(() => undefined);
    if (isFirebaseClientConfigured) await fbSignOut(clientAuth()).catch(() => undefined);
    setUser(null);
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    requireConfigured();
    await sendPasswordResetEmail(clientAuth(), email.trim());
  }, []);

  const value = useMemo(() => ({ user, loading, signIn, signUp, signOut, resetPassword }), [user, loading, signIn, signUp, signOut, resetPassword]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used within AuthProvider");
  return v;
}

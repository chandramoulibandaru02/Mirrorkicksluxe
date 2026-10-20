"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldCheck } from "lucide-react";
import { SITE_NAME } from "@/lib/brand";
import { friendlyAuthError, useAuth } from "@/components/auth-provider";

export function AdminLoginForm({ signedInNonAdmin }: { signedInNonAdmin: boolean }) {
  const { signIn, signOut } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(signedInNonAdmin ? "You are signed in with an account that is not authorised for administration. Sign in with an administrator account." : "");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const u = await signIn(email, password);
      if (!u.isAdmin) {
        await signOut();
        setError("This account is not authorised to access the administrator dashboard.");
        setBusy(false);
        return;
      }
      router.replace("/admin");
      router.refresh();
    } catch (err) {
      setError(friendlyAuthError(err));
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <form onSubmit={onSubmit} className="card w-full max-w-sm space-y-4 p-6">
        <div className="flex items-center gap-2">
          <ShieldCheck className="text-brand" aria-hidden />
          <h1 className="text-lg font-bold">{SITE_NAME} administration</h1>
        </div>
        <div>
          <label htmlFor="a-email" className="label">Email</label>
          <input id="a-email" type="email" className="field" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" />
        </div>
        <div>
          <label htmlFor="a-pass" className="label">Password</label>
          <input id="a-pass" type="password" className="field" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
        </div>
        {error && <p role="alert" className="text-sm font-semibold text-danger">{error}</p>}
        <button type="submit" className="btn btn-primary w-full" disabled={busy}>
          {busy && <Loader2 size={18} className="animate-spin" aria-hidden />} Sign in
        </button>
      </form>
    </div>
  );
}

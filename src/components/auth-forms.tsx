"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { friendlyAuthError, useAuth } from "./auth-provider";

export function safeNext(next: string | null | undefined): string {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : "/account";
}

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="container-x flex justify-center py-8">
      <div className="card w-full max-w-md p-5 sm:p-7">
        <h1 className="mb-4 text-xl font-bold">{title}</h1>
        {children}
      </div>
    </div>
  );
}

function Field({ id, label, type = "text", value, onChange, autoComplete, minLength }: { id: string; label: string; type?: string; value: string; onChange: (v: string) => void; autoComplete?: string; minLength?: number }) {
  return (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      <input id={id} name={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} className="field" required autoComplete={autoComplete} minLength={minLength} />
    </div>
  );
}

function Submit({ busy, children }: { busy: boolean; children: React.ReactNode }) {
  return (
    <button type="submit" className="btn btn-primary w-full" disabled={busy}>
      {busy && <Loader2 size={18} className="animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

export function LoginForm({ next }: { next?: string }) {
  const { signIn } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await signIn(email, password);
      router.replace(safeNext(next));
      router.refresh();
    } catch (err) {
      setError(friendlyAuthError(err));
      setBusy(false);
    }
  }
  return (
    <Shell title="Sign in">
      <form onSubmit={onSubmit} className="space-y-4" noValidate={false}>
        <Field id="email" label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" />
        <Field id="password" label="Password" type="password" value={password} onChange={setPassword} autoComplete="current-password" />
        {error && <p role="alert" className="text-sm font-semibold text-danger">{error}</p>}
        <Submit busy={busy}>Sign in</Submit>
        <p className="text-sm">
          <Link href="/forgot-password" className="text-brand underline">Forgot your password?</Link>
        </p>
        <p className="border-t border-line pt-3 text-sm">
          New customer?{" "}
          <Link href={`/signup${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-brand underline">Create an account</Link>
        </p>
      </form>
    </Shell>
  );
}

export function SignupForm({ next }: { next?: string }) {
  const { signUp } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (name.trim().length < 2) return setError("Please enter your full name.");
    setBusy(true);
    setError("");
    try {
      await signUp(name, email, password);
      router.replace(safeNext(next));
      router.refresh();
    } catch (err) {
      setError(friendlyAuthError(err));
      setBusy(false);
    }
  }
  return (
    <Shell title="Create your account">
      <form onSubmit={onSubmit} className="space-y-4">
        <Field id="name" label="Full name" value={name} onChange={setName} autoComplete="name" />
        <Field id="email" label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" />
        <Field id="password" label="Password (at least 6 characters)" type="password" value={password} onChange={setPassword} autoComplete="new-password" minLength={6} />
        {error && <p role="alert" className="text-sm font-semibold text-danger">{error}</p>}
        <Submit busy={busy}>Create account</Submit>
        <p className="border-t border-line pt-3 text-sm">
          Already registered?{" "}
          <Link href={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-brand underline">Sign in</Link>
        </p>
      </form>
    </Shell>
  );
}

export function ForgotPasswordForm() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "sent">("idle");
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("busy");
    setError("");
    try {
      await resetPassword(email);
      setState("sent");
    } catch (err) {
      const code = (err as { code?: string }).code;
      // Do not reveal whether an address is registered.
      if (code === "auth/user-not-found" || code === "auth/invalid-email") setState("sent");
      else {
        setError(friendlyAuthError(err));
        setState("idle");
      }
    }
  }
  return (
    <Shell title="Reset your password">
      {state === "sent" ? (
        <p role="status" className="text-sm">If an account exists for <strong>{email}</strong>, a password reset link has been sent. Check your inbox and spam folder.</p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <p className="text-sm text-muted">Enter your email and we will send you a link to choose a new password.</p>
          <Field id="email" label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" />
          {error && <p role="alert" className="text-sm font-semibold text-danger">{error}</p>}
          <Submit busy={state === "busy"}>Send reset link</Submit>
        </form>
      )}
      <p className="mt-4 text-sm"><Link href="/login" className="text-brand underline">Back to sign in</Link></p>
    </Shell>
  );
}

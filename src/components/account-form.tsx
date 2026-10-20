"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";
import type { Address } from "@/lib/types";
import { useAuth } from "./auth-provider";
import { AddressFields, emptyAddress, validateAddress } from "./address-fields";

export function AccountForm() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [draft, setDraft] = useState<Address | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [state, setState] = useState<"loading" | "idle" | "saving" | "saved">("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/account", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setName(d.name ?? "");
        setPhone(d.phone ?? "");
        setAddresses(d.addresses ?? []);
        setState("idle");
      })
      .catch(() => { setError("Could not load your details."); setState("idle"); });
  }, []);

  async function save(next: Address[] = addresses) {
    setState("saving");
    setError("");
    const res = await fetch("/api/account", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, phone, addresses: next }) });
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      setError(b.fields ? Object.values(b.fields as Record<string, string>)[0] : (b.error ?? "Could not save."));
      setState("idle");
      return false;
    }
    setAddresses(next);
    setState("saved");
    return true;
  }

  if (state === "loading") return <p className="flex items-center gap-2" role="status"><Loader2 className="animate-spin" size={18} aria-hidden /> Loading…</p>;

  return (
    <div className="space-y-5">
      <section className="card p-4 sm:p-5">
        <h2 className="mb-3 text-base font-bold">Account details</h2>
        <form onSubmit={(e) => { e.preventDefault(); void save(); }} className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="acc-name" className="label">Full name</label>
            <input id="acc-name" className="field" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} autoComplete="name" />
          </div>
          <div>
            <label htmlFor="acc-email" className="label">Email</label>
            <input id="acc-email" className="field bg-page" value={user?.email ?? ""} readOnly />
          </div>
          <div>
            <label htmlFor="acc-phone" className="label">Mobile number <span className="font-normal text-muted">(optional)</span></label>
            <input id="acc-phone" className="field" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" maxLength={10} autoComplete="tel-national" />
          </div>
          <div className="flex items-end">
            <button type="submit" className="btn btn-primary" disabled={state === "saving"}>
              {state === "saving" && <Loader2 size={18} className="animate-spin" aria-hidden />} Save details
            </button>
          </div>
        </form>
        {state === "saved" && <p role="status" className="mt-2 text-sm text-ok">Saved.</p>}
        {error && <p role="alert" className="mt-2 text-sm font-semibold text-danger">{error}</p>}
      </section>

      <section className="card p-4 sm:p-5" aria-labelledby="saved-addr">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="saved-addr" className="text-base font-bold">Saved addresses</h2>
          {!draft && addresses.length < 5 && (
            <button type="button" className="btn btn-outline btn-sm" onClick={() => { setDraft({ ...emptyAddress, fullName: name, phone }); setErrors({}); }}>
              <Plus size={16} aria-hidden /> Add address
            </button>
          )}
        </div>
        {addresses.length === 0 && !draft && <p className="text-sm text-muted">You have no saved addresses yet.</p>}
        <ul className="space-y-2">
          {addresses.map((a, i) => (
            <li key={i} className="flex items-start justify-between gap-3 rounded-[3px] border border-line p-3 text-sm">
              <p>
                <strong>{a.fullName}</strong> · {a.phone}
                <br />
                {a.line1}{a.line2 ? `, ${a.line2}` : ""}, {a.city}, {a.state} {a.pincode}
              </p>
              <button type="button" className="flex min-h-10 items-center gap-1 text-danger hover:underline" onClick={() => save(addresses.filter((_, j) => j !== i))} aria-label={`Remove address for ${a.fullName}, ${a.city}`}>
                <Trash2 size={16} aria-hidden /> Remove
              </button>
            </li>
          ))}
        </ul>
        {draft && (
          <form
            className="mt-4 space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              const errs = validateAddress(draft);
              setErrors(errs);
              if (Object.keys(errs).length) return;
              if (await save([...addresses, draft])) setDraft(null);
            }}
            noValidate
          >
            <AddressFields value={draft} onChange={setDraft} errors={errors} idPrefix="new" />
            <div className="flex gap-2">
              <button type="submit" className="btn btn-primary">Save address</button>
              <button type="button" className="btn btn-outline" onClick={() => setDraft(null)}>Cancel</button>
            </div>
          </form>
        )}
      </section>

      <button type="button" className="btn btn-outline" onClick={async () => { await signOut(); router.replace("/"); router.refresh(); }}>Sign out</button>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Banknote, Loader2 } from "lucide-react";
import type { Address } from "@/lib/types";
import { useAuth } from "./auth-provider";
import { useCart } from "./cart-provider";
import { AddressFields, emptyAddress, validateAddress } from "./address-fields";
import { EmptyState, ProductImage } from "./product-ui";
import { TotalsBox, useResolvedCart } from "./cart-view";
import { formatINR } from "@/lib/pricing";

export function CheckoutForm() {
  const router = useRouter();
  const { user } = useAuth();
  const { clear } = useCart();
  const { items, ready, data, error: loadError, loading } = useResolvedCart();
  const [saved, setSaved] = useState<Address[]>([]);
  const [choice, setChoice] = useState<number | "new">("new");
  const [addr, setAddr] = useState<Address>(emptyAddress);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveAddr, setSaveAddr] = useState(true);
  const [submitError, setSubmitError] = useState("");
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  // One idempotency key per checkout page view: a double submit resolves to the same order on the server.
  const [idempotencyKey] = useState(() => crypto.randomUUID().replace(/-/g, ""));

  useEffect(() => {
    fetch("/api/account", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { name: string; phone: string; addresses: Address[] } | null) => {
        if (!d) return;
        setSaved(d.addresses);
        if (d.addresses.length) {
          setChoice(0);
          setAddr(d.addresses[0]);
        } else setAddr({ ...emptyAddress, fullName: d.name, phone: d.phone });
      })
      .catch(() => undefined);
  }, []);

  if (!ready || loading) return <p className="flex items-center gap-2 p-6" role="status"><Loader2 className="animate-spin" size={20} aria-hidden /> Preparing checkout…</p>;
  if (items.length === 0) return <EmptyState title="Your cart is empty"><Link href="/products" className="btn btn-primary mt-2">Continue shopping</Link></EmptyState>;
  if (loadError || !data) return <EmptyState title="We could not load your order">Please refresh and try again.</EmptyState>;

  const problems = data.lines.filter((l) => !l.available || l.quantity > l.stock);
  const blocked = problems.length > 0;

  async function place(e: React.FormEvent) {
    e.preventDefault();
    if (submitting.current || !data) return; // blocks double clicks before React re-renders
    const errs = validateAddress(addr);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    submitting.current = true;
    setBusy(true);
    setSubmitError("");
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ items, address: { ...addr, line2: addr.line2 ?? "" }, contactPhone: addr.phone.trim(), paymentMethod: "cod", idempotencyKey }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 401) {
          router.replace("/login?next=%2Fcheckout");
          return;
        }
        setSubmitError(body.error ?? "We could not place your order. Please try again.");
        if (body.fields) setErrors(Object.fromEntries(Object.entries(body.fields as Record<string, string>).map(([k, v]) => [k.replace(/^address\./, ""), v])));
        submitting.current = false;
        setBusy(false);
        return;
      }
      if (saveAddr && choice === "new" && saved.length < 5) {
        fetch("/api/account", { method: "GET" })
          .then((r) => r.json())
          .then((p) => fetch("/api/account", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: p.name || addr.fullName, phone: p.phone, addresses: [...(p.addresses ?? []), addr].slice(0, 5) }) }))
          .catch(() => undefined);
      }
      clear();
      router.replace(`/orders/${body.orderId}?placed=1`);
    } catch {
      setSubmitError("Network error. Your order was not placed; please try again.");
      submitting.current = false;
      setBusy(false);
    }
  }

  return (
    <form onSubmit={place} className="grid gap-4 lg:grid-cols-[1fr_22rem]" noValidate>
      <div className="space-y-4">
        <section className="card p-4 sm:p-5" aria-labelledby="addr-h">
          <h2 id="addr-h" className="mb-3 text-base font-bold">1. Delivery address</h2>
          {saved.length > 0 && (
            <fieldset className="mb-4 space-y-2">
              <legend className="sr-only">Choose a saved address</legend>
              {saved.map((a, i) => (
                <label key={i} className={`flex cursor-pointer gap-3 rounded-[3px] border p-3 text-sm ${choice === i ? "border-brand bg-brand-soft" : "border-line"}`}>
                  <input type="radio" name="addr" checked={choice === i} onChange={() => { setChoice(i); setAddr(a); setErrors({}); }} className="mt-1 accent-brand" />
                  <span>
                    <strong>{a.fullName}</strong> · {a.phone}
                    <br />
                    {a.line1}{a.line2 ? `, ${a.line2}` : ""}, {a.city}, {a.state} {a.pincode}
                  </span>
                </label>
              ))}
              <label className={`flex cursor-pointer items-center gap-3 rounded-[3px] border p-3 text-sm ${choice === "new" ? "border-brand bg-brand-soft" : "border-line"}`}>
                <input type="radio" name="addr" checked={choice === "new"} onChange={() => { setChoice("new"); setAddr(emptyAddress); }} className="accent-brand" />
                Use a new address
              </label>
            </fieldset>
          )}
          {(choice === "new" || saved.length === 0) && (
            <>
              <AddressFields value={addr} onChange={setAddr} errors={errors} idPrefix="co" />
              {saved.length < 5 && (
                <label className="mt-3 flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={saveAddr} onChange={(e) => setSaveAddr(e.target.checked)} className="size-4 accent-brand" /> Save this address to my account
                </label>
              )}
            </>
          )}
          <p className="mt-3 text-sm text-muted">Order updates will be sent to {user?.email}.</p>
        </section>

        <section className="card p-4 sm:p-5" aria-labelledby="pay-h">
          <h2 id="pay-h" className="mb-3 text-base font-bold">2. Payment</h2>
          {data.codEnabled ? (
            <label className="flex items-start gap-3 rounded-[3px] border border-brand bg-brand-soft p-3 text-sm">
              <input type="radio" checked readOnly className="mt-1 accent-brand" />
              <span>
                <span className="flex items-center gap-2 font-semibold"><Banknote size={18} aria-hidden /> Cash on delivery</span>
                Pay {formatINR(data.totals.total)} in cash when your order arrives.
              </span>
            </label>
          ) : (
            <p role="alert" className="text-sm font-semibold text-danger">No payment method is available right now, so orders cannot be placed. Please contact us.</p>
          )}
        </section>
      </div>

      <aside className="card h-fit p-4" aria-label="Order summary">
        <h2 className="mb-3 text-base font-bold">Order summary</h2>
        <ul className="mb-3 space-y-2 border-b border-line pb-3">
          {data.lines.map((l) => (
            <li key={`${l.productId}-${l.sku}`} className="flex gap-2 text-sm">
              <div className="relative size-12 shrink-0 bg-white"><ProductImage src={l.image} alt="" sizes="48px" /></div>
              <div className="min-w-0 flex-1">
                <p className="truncate">{l.name}</p>
                <p className="text-xs text-muted">Size {l.size} · Qty {l.quantity}</p>
                {(!l.available || l.quantity > l.stock) && <p className="text-xs font-semibold text-danger">Not available in this quantity</p>}
              </div>
              {l.available && <p>{formatINR(l.price * l.quantity)}</p>}
            </li>
          ))}
        </ul>
        <TotalsBox totals={data.totals} freeShippingThreshold={data.freeShippingThreshold} />
        {blocked && <p role="alert" className="mt-3 text-sm font-semibold text-danger">Some items are unavailable. <Link href="/cart" className="underline">Review your cart</Link>.</p>}
        {submitError && <p role="alert" className="mt-3 text-sm font-semibold text-danger">{submitError}</p>}
        <button type="submit" className="btn btn-cta mt-4 w-full" disabled={busy || blocked || !data.codEnabled}>
          {busy && <Loader2 size={18} className="animate-spin" aria-hidden />}
          {busy ? "Placing order…" : "Place order"}
        </button>
      </aside>
    </form>
  );
}

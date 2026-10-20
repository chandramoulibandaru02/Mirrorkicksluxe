"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Trash2 } from "lucide-react";
import { formatINR } from "@/lib/pricing";
import type { CartLine } from "@/lib/types";
import type { Totals } from "@/lib/pricing";
import { useCart, MAX_QTY } from "./cart-provider";
import { useAuth } from "./auth-provider";
import { EmptyState, Price, ProductImage } from "./product-ui";

export interface Resolved {
  lines: CartLine[];
  totals: Totals;
  codEnabled: boolean;
  freeShippingThreshold: number;
}

/** Fetches display lines, prices and stock for the current cart from the server. */
export function useResolvedCart() {
  const { items, ready } = useCart();
  const [data, setData] = useState<Resolved | null>(null);
  const [error, setError] = useState(false);
  const key = JSON.stringify(items);

  useEffect(() => {
    if (!ready) return;
    if (items.length === 0) return;
    let live = true;
    fetch("/api/cart/resolve", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ items }) })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("failed"))))
      .then((d: Resolved) => {
        if (!live) return;
        setData(d);
        setError(false);
      })
      .catch(() => live && setError(true));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, ready]);

  const empty = items.length === 0;
  return { items, ready, data: empty ? null : data, error: empty ? false : error, loading: ready && !empty && !data && !error };
}

export function TotalsBox({ totals, freeShippingThreshold }: { totals: Totals; freeShippingThreshold?: number }) {
  return (
    <dl className="space-y-2 text-sm">
      {totals.savings > 0 && (
        <div className="flex justify-between"><dt>Price (MRP)</dt><dd>{formatINR(totals.mrpTotal)}</dd></div>
      )}
      {totals.savings > 0 && (
        <div className="flex justify-between"><dt>Discount</dt><dd className="text-ok">−{formatINR(totals.savings)}</dd></div>
      )}
      <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatINR(totals.subtotal)}</dd></div>
      <div className="flex justify-between"><dt>Delivery</dt><dd>{totals.shipping === 0 ? "Free" : formatINR(totals.shipping)}</dd></div>
      {freeShippingThreshold && freeShippingThreshold > 0 && totals.shipping > 0 && (
        <p className="text-xs text-muted">Free delivery on orders above {formatINR(freeShippingThreshold)}.</p>
      )}
      <div className="flex justify-between border-t border-line pt-2 text-base font-bold"><dt>Total</dt><dd>{formatINR(totals.total)}</dd></div>
      {totals.savings > 0 && <p className="text-sm font-semibold text-ok">You save {formatINR(totals.savings)} on this order</p>}
    </dl>
  );
}

export function CartView() {
  const { setQuantity, remove } = useCart();
  const { user } = useAuth();
  const { items, ready, data, error, loading } = useResolvedCart();

  if (!ready || loading) {
    return (
      <div className="flex items-center gap-2 p-6" role="status">
        <Loader2 className="animate-spin" size={20} aria-hidden /> Loading your cart…
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <EmptyState title="Your cart is empty">
        <Link href="/products" className="btn btn-primary mt-2">Continue shopping</Link>
      </EmptyState>
    );
  }
  if (error || !data) {
    return <EmptyState title="We could not load your cart">Please refresh the page and try again.</EmptyState>;
  }

  const problems = data.lines.filter((l) => !l.available || l.quantity > l.stock);
  const canCheckout = problems.length === 0;

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
      <ul className="space-y-3">
        {data.lines.map((l) => {
          const bad = !l.available || l.quantity > l.stock;
          return (
            <li key={`${l.productId}-${l.sku}`} className="card flex gap-3 p-3 sm:gap-4 sm:p-4">
              <div className="relative size-24 shrink-0 bg-white sm:size-28">
                <ProductImage src={l.image} alt={l.name} sizes="112px" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold tracking-wide text-muted uppercase">{l.brand}</p>
                {l.slug ? <Link href={`/products/${l.slug}`} className="line-clamp-2 text-sm font-semibold hover:underline">{l.name}</Link> : <p className="text-sm font-semibold">{l.name}</p>}
                {l.size && <p className="text-sm text-muted">Size {l.size} · {l.color}</p>}
                {l.available && <div className="mt-1"><Price price={l.price} originalPrice={l.originalPrice} /></div>}
                {bad && (
                  <p role="alert" className="mt-1 text-sm font-semibold text-danger">
                    {!l.available ? "Out of stock or no longer sold. Remove it to continue." : `Only ${l.stock} available. Reduce the quantity to continue.`}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  {l.available && (
                    <>
                      <label htmlFor={`q-${l.sku}`} className="sr-only">Quantity for {l.name}</label>
                      <select id={`q-${l.sku}`} className="field w-20" value={Math.min(l.quantity, MAX_QTY)} onChange={(e) => setQuantity(l.productId, l.sku, Number(e.target.value))}>
                        {Array.from({ length: Math.max(1, Math.min(MAX_QTY, Math.max(l.stock, l.quantity))) }, (_, i) => i + 1).map((n) => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                    </>
                  )}
                  <button type="button" onClick={() => remove(l.productId, l.sku)} className="flex min-h-10 items-center gap-1.5 text-sm font-semibold text-danger hover:underline">
                    <Trash2 size={16} aria-hidden /> Remove
                  </button>
                </div>
              </div>
              {l.available && <p className="hidden text-right text-sm font-bold sm:block">{formatINR(l.price * l.quantity)}</p>}
            </li>
          );
        })}
      </ul>
      <aside className="card h-fit p-4" aria-label="Order summary">
        <h2 className="mb-3 text-base font-bold">Price details</h2>
        <TotalsBox totals={data.totals} freeShippingThreshold={data.freeShippingThreshold} />
        {!canCheckout && <p className="mt-3 text-sm font-semibold text-danger" role="alert">Fix the items marked above to continue.</p>}
        <Link href={user ? "/checkout" : "/login?next=%2Fcheckout"} aria-disabled={!canCheckout} onClick={(e) => !canCheckout && e.preventDefault()} className="btn btn-cta mt-4 w-full">
          {user ? "Proceed to checkout" : "Sign in to checkout"}
        </Link>
      </aside>
    </div>
  );
}

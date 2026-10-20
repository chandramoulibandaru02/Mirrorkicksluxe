import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { adminDb } from "@/lib/server/firebase-admin";
import { requireUserPage } from "@/lib/server/session";
import { toOrder } from "@/lib/server/orders";
import { formatINR } from "@/lib/pricing";
import { customerCanCancel } from "@/lib/order-rules";
import { ProductImage } from "@/components/product-ui";
import { StatusBadge } from "@/components/status-badge";
import { CancelOrderButton } from "@/components/cancel-order-button";
import { TotalsBox } from "@/components/cart-view";

export const metadata: Metadata = { title: "Order details", robots: { index: false } };

export default async function OrderPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ placed?: string }> }) {
  const { id } = await params;
  const { placed } = await searchParams;
  const s = await requireUserPage(`/orders/${id}`);
  const snap = await adminDb().collection("orders").doc(id).get();
  // Ownership is enforced here; another customer's order looks exactly like a missing one.
  if (!snap.exists || snap.get("userId") !== s.uid) notFound();
  const o = toOrder(snap.id, snap.data()!);
  const fmt = (iso: string) => new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" });

  return (
    <div className="container-x max-w-4xl py-4 sm:py-6">
      {placed === "1" && (
        <div className="card mb-4 flex items-start gap-3 border-ok p-4" role="status">
          <CheckCircle2 className="shrink-0 text-ok" aria-hidden />
          <div>
            <p className="font-bold">Your order has been placed.</p>
            <p className="text-sm">Keep your order number <strong>{o.id}</strong> for reference. Pay {formatINR(o.total)} in cash on delivery.</p>
          </div>
        </div>
      )}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">Order {o.id}</h1>
        <div className="flex gap-2"><StatusBadge status={o.status} /><StatusBadge status={`${o.paymentStatus}`} /></div>
      </div>
      <p className="mb-4 text-sm text-muted">Placed on {fmt(o.createdAt)} · Payment: cash on delivery ({o.paymentStatus})</p>

      <div className="grid gap-4 md:grid-cols-[1fr_20rem]">
        <ul className="space-y-3">
          {o.items.map((i) => (
            <li key={`${i.productId}-${i.sku}`} className="card flex gap-3 p-3">
              <div className="relative size-20 shrink-0 bg-white"><ProductImage src={i.image} alt={i.name} sizes="80px" /></div>
              <div className="min-w-0 flex-1 text-sm">
                <p className="text-xs font-semibold tracking-wide text-muted uppercase">{i.brand}</p>
                <Link href={`/products/${i.slug}`} className="font-semibold hover:underline">{i.name}</Link>
                <p className="text-muted">Size {i.size} · {i.color} · Qty {i.quantity}</p>
              </div>
              <p className="text-sm font-bold">{formatINR(i.lineTotal)}</p>
            </li>
          ))}
        </ul>
        <div className="space-y-4">
          <section className="card p-4" aria-label="Price details">
            <h2 className="mb-3 text-base font-bold">Price details</h2>
            <TotalsBox totals={{ mrpTotal: o.mrpTotal, subtotal: o.subtotal, savings: o.savings, shipping: o.shipping, total: o.total }} />
          </section>
          <section className="card p-4 text-sm" aria-label="Delivery address">
            <h2 className="mb-2 text-base font-bold">Delivery address</h2>
            <p><strong>{o.address.fullName}</strong> · {o.address.phone}</p>
            <p>{o.address.line1}{o.address.line2 ? `, ${o.address.line2}` : ""}</p>
            <p>{o.address.city}, {o.address.state} {o.address.pincode}</p>
          </section>
          <section className="card p-4 text-sm" aria-label="Order history">
            <h2 className="mb-2 text-base font-bold">Order history</h2>
            <ol className="space-y-1.5">
              {o.statusHistory.filter((h) => h.kind === "fulfillment").map((h, i) => (
                <li key={i} className="flex justify-between gap-2"><span className="capitalize">{h.status}</span><span className="text-muted">{fmt(h.at)}</span></li>
              ))}
            </ol>
          </section>
          {customerCanCancel(o.status) && <CancelOrderButton orderId={o.id} />}
        </div>
      </div>
    </div>
  );
}

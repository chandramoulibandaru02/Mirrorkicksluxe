import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { adminDb } from "@/lib/server/firebase-admin";
import { requireAdminPage } from "@/lib/server/session";
import { toOrder } from "@/lib/server/orders";
import { formatINR } from "@/lib/pricing";
import { StatusBadge } from "@/components/status-badge";
import { OrderActions } from "@/components/admin/order-actions";
import { EmptyState } from "@/components/product-ui";
import type { Order } from "@/lib/types";

export const metadata = { title: "Order" };

const fmt = (iso: string) => new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" });

export default async function AdminOrderPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage();
  const { id } = await params;
  let order: Order | null | undefined;
  try {
    const snap = await adminDb().collection("orders").doc(id).get();
    order = snap.exists ? toOrder(snap.id, snap.data()!) : null;
  } catch (e) {
    console.error("[admin] order load failed", e instanceof Error ? e.message : e);
  }
  if (order === undefined) return <EmptyState title="Could not load this order">Check the Firebase configuration and try again.</EmptyState>;
  if (order === null) notFound();

  const a = order.address;
  const history = [...order.statusHistory].reverse();
  return (
    <div className="space-y-4">
      <Link href="/admin/orders" className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline"><ArrowLeft size={16} aria-hidden /> All orders</Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-bold">{order.id}</h1>
        <StatusBadge status={order.status} />
        <span className="text-sm text-muted">Payment</span>
        <StatusBadge status={order.paymentStatus} />
      </div>
      <p className="text-sm text-muted">Placed {fmt(order.createdAt)} (IST) · {order.paymentMethod === "cod" ? "Cash on delivery" : order.paymentMethod}</p>

      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-4">
          <section className="card overflow-x-auto" aria-labelledby="items-h">
            <h2 id="items-h" className="border-b border-line p-3 text-base font-bold">Items</h2>
            <table className="w-full min-w-[30rem] text-left text-sm">
              <thead className="border-b border-line bg-page">
                <tr><th className="p-2.5">Product</th><th className="p-2.5">Size</th><th className="p-2.5">Qty</th><th className="p-2.5">Price</th><th className="p-2.5 text-right">Line total</th></tr>
              </thead>
              <tbody>
                {order.items.map((i) => (
                  <tr key={`${i.productId}-${i.sku}`} className="border-b border-line last:border-0">
                    <td className="p-2.5">
                      <Link href={`/admin/products/${i.productId}`} className="font-semibold text-brand hover:underline">{i.name}</Link>
                      <br /><span className="text-xs text-muted">{i.brand} · {i.color} · SKU {i.sku}</span>
                    </td>
                    <td className="p-2.5">{i.size}</td>
                    <td className="p-2.5">{i.quantity}</td>
                    <td className="p-2.5">{formatINR(i.unitPrice)}</td>
                    <td className="p-2.5 text-right">{formatINR(i.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <dl className="space-y-1 border-t border-line p-3 text-sm sm:ml-auto sm:max-w-xs">
              {order.savings > 0 && <div className="flex justify-between"><dt>Discount</dt><dd>−{formatINR(order.savings)}</dd></div>}
              <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatINR(order.subtotal)}</dd></div>
              <div className="flex justify-between"><dt>Delivery</dt><dd>{order.shipping === 0 ? "Free" : formatINR(order.shipping)}</dd></div>
              <div className="flex justify-between border-t border-line pt-1 font-bold"><dt>Total</dt><dd>{formatINR(order.total)}</dd></div>
            </dl>
          </section>

          <section className="card p-4" aria-labelledby="hist-h">
            <h2 id="hist-h" className="mb-3 text-base font-bold">History</h2>
            <ol className="space-y-2 text-sm">
              {history.map((h, idx) => (
                <li key={idx} className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-line pb-2 last:border-0 last:pb-0">
                  <span className="text-xs uppercase tracking-wide text-muted">{h.kind === "payment" ? "Payment" : "Order"}</span>
                  <StatusBadge status={h.status} />
                  <span>{fmt(h.at)}</span>
                  <span className="text-muted">by {h.by.startsWith("admin:") ? "admin" : h.by.startsWith("customer:") ? "customer" : h.by}</span>
                  {h.note && <span className="w-full">“{h.note}”</span>}
                </li>
              ))}
            </ol>
          </section>
        </div>

        <div className="space-y-4">
          <section className="card p-4 text-sm" aria-labelledby="cust-h">
            <h2 id="cust-h" className="mb-2 text-base font-bold">Customer and delivery</h2>
            <p className="font-semibold">{a.fullName}</p>
            <p>{a.line1}{a.line2 ? `, ${a.line2}` : ""}<br />{a.city}, {a.state} {a.pincode}</p>
            <p className="mt-2"><a className="text-brand hover:underline" href={`tel:${order.contact.phone}`}>{order.contact.phone}</a><br /><a className="break-all text-brand hover:underline" href={`mailto:${order.contact.email}`}>{order.contact.email}</a></p>
          </section>
          <section className="card p-4" aria-labelledby="act-h">
            <h2 id="act-h" className="mb-3 text-base font-bold">Update order</h2>
            <OrderActions order={order} />
          </section>
        </div>
      </div>
    </div>
  );
}

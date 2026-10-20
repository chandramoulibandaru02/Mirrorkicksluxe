import type { Metadata } from "next";
import Link from "next/link";
import { adminDb } from "@/lib/server/firebase-admin";
import { requireUserPage } from "@/lib/server/session";
import { toOrder } from "@/lib/server/orders";
import { formatINR } from "@/lib/pricing";
import { EmptyState } from "@/components/product-ui";
import { StatusBadge } from "@/components/status-badge";
import type { Order } from "@/lib/types";

export const metadata: Metadata = { title: "Your orders", robots: { index: false } };

export default async function OrdersPage() {
  const s = await requireUserPage("/account/orders");
  let orders: Order[] = [];
  let failed = false;
  try {
    const snap = await adminDb().collection("orders").where("userId", "==", s.uid).orderBy("createdAt", "desc").limit(50).get();
    orders = snap.docs.map((d) => toOrder(d.id, d.data()));
  } catch (e) {
    console.error("[orders] list failed", e instanceof Error ? e.message : e);
    failed = true;
  }
  return (
    <div className="container-x max-w-3xl py-4 sm:py-6">
      <h1 className="mb-3 text-xl font-bold">Your orders</h1>
      {failed ? (
        <EmptyState title="We could not load your orders">Please try again in a moment.</EmptyState>
      ) : orders.length === 0 ? (
        <EmptyState title="You have not placed any orders yet">
          <Link href="/products" className="btn btn-primary mt-2">Start shopping</Link>
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {orders.map((o) => (
            <li key={o.id}>
              <Link href={`/orders/${o.id}`} className="card block p-4 hover:border-brand">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">{o.id}</p>
                  <StatusBadge status={o.status} />
                </div>
                <p className="mt-1 text-sm text-muted">
                  {new Date(o.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" })} · {o.items.reduce((n, i) => n + i.quantity, 0)} item(s) · {formatINR(o.total)}
                </p>
                <p className="mt-1 truncate text-sm">{o.items.map((i) => i.name).join(", ")}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

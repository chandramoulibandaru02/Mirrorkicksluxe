import Link from "next/link";
import { adminDb } from "@/lib/server/firebase-admin";
import { requireAdminPage } from "@/lib/server/session";
import { toOrder } from "@/lib/server/orders";
import { formatINR } from "@/lib/pricing";
import { ORDER_STATUSES, PAYMENT_STATUSES } from "@/lib/order-rules";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/product-ui";
import type { Order } from "@/lib/types";

export const metadata = { title: "Orders" };

const SCAN_LIMIT = 300;
const IST = "Asia/Kolkata";

type Search = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const isDay = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));

const fmtDate = (iso: string) => new Date(iso).toLocaleString("en-IN", { timeZone: IST, dateStyle: "medium", timeStyle: "short" });

async function load(q: string, status: string, payment: string, from: string, to: string): Promise<{ orders: Order[]; scanned: number; capped: boolean }> {
  const db = adminDb();

  // An exact order ID is looked up directly so older orders are always findable.
  const exact = q.trim().toUpperCase();
  if (/^ORD-[A-Z0-9]{6,}$/.test(exact)) {
    const snap = await db.collection("orders").doc(exact).get();
    return { orders: snap.exists ? [toOrder(snap.id, snap.data()!)] : [], scanned: 1, capped: false };
  }

  let query: FirebaseFirestore.Query = db.collection("orders");
  if ((ORDER_STATUSES as string[]).includes(status)) query = query.where("status", "==", status);
  // Dates are interpreted in Indian Standard Time, the store's business day.
  if (isDay(from)) query = query.where("createdAt", ">=", new Date(`${from}T00:00:00+05:30`));
  if (isDay(to)) query = query.where("createdAt", "<", new Date(new Date(`${to}T00:00:00+05:30`).getTime() + 24 * 3600 * 1000));
  const snap = await query.orderBy("createdAt", "desc").limit(SCAN_LIMIT).get();

  let orders = snap.docs.map((d) => toOrder(d.id, d.data()));
  const scanned = orders.length;
  if ((PAYMENT_STATUSES as string[]).includes(payment)) orders = orders.filter((o) => o.paymentStatus === payment);
  const needle = q.trim().toLowerCase();
  if (needle) {
    orders = orders.filter((o) =>
      [o.id, o.contact.name, o.contact.email, o.contact.phone, o.address.city, o.address.pincode].some((f) => f?.toLowerCase().includes(needle)),
    );
  }
  return { orders, scanned, capped: scanned >= SCAN_LIMIT };
}

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<Search> }) {
  await requireAdminPage();
  const sp = await searchParams;
  const q = one(sp.q).slice(0, 80);
  const status = one(sp.status);
  const payment = one(sp.payment);
  const from = one(sp.from);
  const to = one(sp.to);
  const filtered = Boolean(q || status || payment || from || to);

  let data: Awaited<ReturnType<typeof load>> | null = null;
  try {
    data = await load(q, status, payment, from, to);
  } catch (e) {
    console.error("[admin] orders load failed", e instanceof Error ? e.message : e);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Orders</h1>

      <form method="get" className="card grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] lg:items-end" role="search" aria-label="Filter orders">
        <div>
          <label htmlFor="f-q" className="label">Search</label>
          <input id="f-q" name="q" defaultValue={q} className="field" placeholder="Order ID, name, email, phone, city" maxLength={80} />
        </div>
        <div>
          <label htmlFor="f-status" className="label">Order status</label>
          <select id="f-status" name="status" defaultValue={status} className="field">
            <option value="">All</option>
            {ORDER_STATUSES.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="f-pay" className="label">Payment</label>
          <select id="f-pay" name="payment" defaultValue={payment} className="field">
            <option value="">All</option>
            {PAYMENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="f-from" className="label">From date</label>
          <input id="f-from" type="date" name="from" defaultValue={isDay(from) ? from : ""} className="field" />
        </div>
        <div>
          <label htmlFor="f-to" className="label">To date</label>
          <input id="f-to" type="date" name="to" defaultValue={isDay(to) ? to : ""} className="field" />
        </div>
        <div className="flex gap-2">
          <button type="submit" className="btn btn-primary">Apply</button>
          {filtered && <Link href="/admin/orders" className="btn btn-outline">Clear</Link>}
        </div>
      </form>

      {!data ? (
        <EmptyState title="Could not load orders">
          Check the Firebase credentials. If you filtered by status or date, make sure the Firestore indexes from <code>firestore.indexes.json</code> are deployed.
        </EmptyState>
      ) : data.orders.length === 0 ? (
        <EmptyState title={filtered ? "No orders match these filters" : "No orders yet"}>
          {filtered ? "Try clearing a filter." : "Orders placed by customers will appear here."}
        </EmptyState>
      ) : (
        <>
          <p className="text-sm text-muted" role="status">
            {data.orders.length} order{data.orders.length === 1 ? "" : "s"}
            {data.capped && ` · searched the ${SCAN_LIMIT} most recent matching the date and status filters; narrow the dates to reach older orders. An exact order ID is always found.`}
          </p>
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[44rem] text-left text-sm">
              <thead className="border-b border-line bg-page">
                <tr><th className="p-2.5">Order</th><th className="p-2.5">Placed (IST)</th><th className="p-2.5">Customer</th><th className="p-2.5">Items</th><th className="p-2.5">Total</th><th className="p-2.5">Status</th><th className="p-2.5">Payment</th></tr>
              </thead>
              <tbody>
                {data.orders.map((o) => (
                  <tr key={o.id} className="border-b border-line last:border-0">
                    <td className="p-2.5"><Link href={`/admin/orders/${o.id}`} className="font-semibold text-brand hover:underline">{o.id}</Link></td>
                    <td className="p-2.5 whitespace-nowrap">{fmtDate(o.createdAt)}</td>
                    <td className="p-2.5">{o.contact.name}<br /><span className="text-xs text-muted">{o.address.city}</span></td>
                    <td className="p-2.5">{o.items.reduce((n, i) => n + i.quantity, 0)}</td>
                    <td className="p-2.5 whitespace-nowrap">{formatINR(o.total)}</td>
                    <td className="p-2.5"><StatusBadge status={o.status} /></td>
                    <td className="p-2.5"><StatusBadge status={o.paymentStatus} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

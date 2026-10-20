import Link from "next/link";
import { AggregateField } from "firebase-admin/firestore";
import { adminDb } from "@/lib/server/firebase-admin";
import { requireAdminPage } from "@/lib/server/session";
import { toOrder } from "@/lib/server/orders";
import { formatINR } from "@/lib/pricing";
import { ORDER_STATUSES } from "@/lib/order-rules";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/product-ui";

export const metadata = { title: "Dashboard" };

async function load() {
  const db = adminDb();
  const products = db.collection("products");
  const orders = db.collection("orders");
  const count = async (q: FirebaseFirestore.Query) => (await q.count().get()).data().count;
  const [published, draft, archived, outOfStock, inventory, paid, pending, recent, ...byStatus] = await Promise.all([
    count(products.where("status", "==", "published")),
    count(products.where("status", "==", "draft")),
    count(products.where("status", "==", "archived")),
    count(products.where("status", "==", "published").where("totalStock", "==", 0)),
    products.where("status", "in", ["published", "draft"]).aggregate({ units: AggregateField.sum("totalStock") }).get(),
    orders.where("paymentStatus", "==", "paid").aggregate({ total: AggregateField.sum("total"), n: AggregateField.count() }).get(),
    orders.where("paymentStatus", "==", "pending").where("status", "in", ["placed", "confirmed", "packed", "shipped", "delivered"]).aggregate({ total: AggregateField.sum("total"), n: AggregateField.count() }).get(),
    orders.orderBy("createdAt", "desc").limit(8).get(),
    ...ORDER_STATUSES.map((s) => count(orders.where("status", "==", s))),
  ]);
  return {
    published, draft, archived, outOfStock,
    units: inventory.data().units ?? 0,
    paidTotal: paid.data().total ?? 0, paidCount: paid.data().n,
    pendingTotal: pending.data().total ?? 0, pendingCount: pending.data().n,
    recent: recent.docs.map((d) => toOrder(d.id, d.data())),
    byStatus: Object.fromEntries(ORDER_STATUSES.map((s, i) => [s, byStatus[i] as number])),
  };
}

export default async function Dashboard() {
  await requireAdminPage();
  let d: Awaited<ReturnType<typeof load>>;
  try {
    d = await load();
  } catch (e) {
    console.error("[admin] dashboard load failed", e instanceof Error ? e.message : e);
    return (
      <div>
        <h1 className="mb-3 text-xl font-bold">Dashboard</h1>
        <EmptyState title="Could not load dashboard data">Check the Firebase credentials and Firestore indexes (see README), then reload.</EmptyState>
      </div>
    );
  }
  const stat = (label: string, value: string | number, note?: string) => (
    <div className="card p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
      {note && <p className="mt-1 text-xs text-muted">{note}</p>}
    </div>
  );
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Dashboard</h1>
      <section aria-label="Catalogue" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stat("Published products", d.published, `${d.draft} draft · ${d.archived} archived`)}
        {stat("Units in stock", d.units.toLocaleString("en-IN"), "Published and draft products")}
        {stat("Published, out of stock", d.outOfStock)}
        {stat("Total products", d.published + d.draft + d.archived)}
      </section>
      <section aria-label="Sales" className="grid gap-3 sm:grid-cols-2">
        {stat("Revenue received", formatINR(d.paidTotal), `${d.paidCount} orders with payment status Paid, including delivery charges. Refunded orders are excluded.`)}
        {stat("Awaiting payment", formatINR(d.pendingTotal), `${d.pendingCount} active orders with payment pending (for example cash on delivery not yet collected).`)}
      </section>
      <section aria-label="Orders by status">
        <h2 className="mb-2 text-base font-bold">Orders by status</h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {ORDER_STATUSES.map((s) => (
            <li key={s}>
              <Link href={`/admin/orders?status=${s}`} className="card block p-3 hover:border-brand">
                <StatusBadge status={s} />
                <p className="mt-1 text-xl font-bold">{d.byStatus[s]}</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <section aria-label="Recent orders">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-base font-bold">Recent orders</h2>
          <Link href="/admin/orders" className="text-sm font-semibold text-brand hover:underline">All orders</Link>
        </div>
        {d.recent.length === 0 ? (
          <EmptyState title="No orders yet" />
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-page"><tr><th className="p-2.5">Order</th><th className="p-2.5">Customer</th><th className="p-2.5">Total</th><th className="p-2.5">Status</th><th className="p-2.5">Payment</th></tr></thead>
              <tbody>
                {d.recent.map((o) => (
                  <tr key={o.id} className="border-b border-line last:border-0">
                    <td className="p-2.5"><Link href={`/admin/orders/${o.id}`} className="font-semibold text-brand hover:underline">{o.id}</Link></td>
                    <td className="p-2.5">{o.contact.name}</td>
                    <td className="p-2.5">{formatINR(o.total)}</td>
                    <td className="p-2.5"><StatusBadge status={o.status} /></td>
                    <td className="p-2.5"><StatusBadge status={o.paymentStatus} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

import "server-only";
import { createHash } from "node:crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "./firebase-admin";
import { HttpError } from "./http";
import { getSettings } from "./settings";
import { notifyOrderOnce, sendTelegram, isTelegramConfigured } from "./telegram";
import { computeTotals, formatINR } from "../pricing";
import { canTransitionPayment, canTransitionStatus, customerCanCancel } from "../order-rules";
import type { Address, CartItem, Order, OrderItem, OrderStatus, PaymentStatus, StatusHistoryEntry } from "../types";

const iso = (t: unknown) => (t instanceof Timestamp ? t.toDate().toISOString() : typeof t === "string" ? t : new Date(0).toISOString());

export function toOrder(id: string, d: FirebaseFirestore.DocumentData): Order {
  return {
    id,
    userId: d.userId,
    items: d.items,
    address: d.address,
    contact: d.contact,
    mrpTotal: d.mrpTotal,
    subtotal: d.subtotal,
    savings: d.savings,
    shipping: d.shipping,
    total: d.total,
    paymentMethod: d.paymentMethod,
    paymentStatus: d.paymentStatus,
    status: d.status,
    statusHistory: d.statusHistory ?? [],
    createdAt: iso(d.createdAt),
    updatedAt: iso(d.updatedAt),
  };
}

/** Deterministic order id from (user, idempotency key): a double-submit resolves to the same order. */
export function orderIdFor(uid: string, key: string): string {
  const h = createHash("sha256").update(`${uid}:${key}`).digest("base64url").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  return `ORD-${h.slice(0, 10)}`;
}

interface CreateInput {
  uid: string;
  email: string;
  items: CartItem[];
  address: Address;
  contactPhone: string;
  idempotencyKey: string;
}

export async function createOrder(input: CreateInput): Promise<{ order: Order; created: boolean }> {
  const db = adminDb();
  const settings = await getSettings();
  if (!settings.codEnabled) throw new HttpError(400, "Cash on delivery is not available right now.");

  const orderId = orderIdFor(input.uid, input.idempotencyKey);
  const orderRef = db.collection("orders").doc(orderId);
  const cartRef = db.collection("carts").doc(input.uid);
  const lowStockCrossings: { name: string; sku: string; stock: number }[] = [];

  const result = await db.runTransaction(async (tx) => {
    const existing = await tx.get(orderRef);
    if (existing.exists) {
      if (existing.get("userId") !== input.uid) throw new HttpError(409, "Order reference conflict. Please retry.");
      return { order: toOrder(orderId, existing.data()!), created: false };
    }

    // Merge duplicate lines, then read every product exactly once (all reads precede writes).
    const wanted = new Map<string, number>();
    for (const it of input.items) wanted.set(`${it.productId}|${it.sku}`, (wanted.get(`${it.productId}|${it.sku}`) ?? 0) + it.quantity);
    const productIds = [...new Set(input.items.map((i) => i.productId))];
    const refs = productIds.map((id) => db.collection("products").doc(id));
    const snaps = await tx.getAll(...refs);
    const byId = new Map(snaps.map((s) => [s.id, s]));

    const items: OrderItem[] = [];
    const newVariants = new Map<string, { sku: string; size: string; color: string; stock: number }[]>();
    for (const [k, quantity] of wanted) {
      const [productId, sku] = k.split("|");
      const snap = byId.get(productId);
      if (!snap?.exists || snap.get("status") !== "published") throw new HttpError(409, "An item in your cart is no longer available. Please review your cart.");
      const variants = (newVariants.get(productId) ?? (snap.get("variants") as { sku: string; size: string; color: string; stock: number }[]).map((v) => ({ ...v })));
      newVariants.set(productId, variants);
      const v = variants.find((x) => x.sku === sku);
      if (!v) throw new HttpError(409, `The selected size of "${snap.get("name")}" is no longer available.`);
      if (v.stock < quantity) {
        throw new HttpError(409, v.stock === 0 ? `"${snap.get("name")}" (size ${v.size}) is out of stock.` : `Only ${v.stock} left of "${snap.get("name")}" (size ${v.size}).`);
      }
      const threshold = settings.lowStockThreshold;
      if (threshold > 0 && v.stock > threshold && v.stock - quantity <= threshold) {
        lowStockCrossings.push({ name: snap.get("name"), sku: v.sku, stock: v.stock - quantity });
      }
      v.stock -= quantity;
      const price = snap.get("price") as number; // server-side price: the client's price is never trusted
      const original = (snap.get("originalPrice") as number | null) ?? price;
      const primary = ((snap.get("images") ?? []) as { url: string; isPrimary: boolean }[]).find((i) => i.isPrimary) ?? (snap.get("images") ?? [])[0];
      items.push({
        productId,
        name: snap.get("name"),
        brand: snap.get("brand"),
        slug: snap.get("slug"),
        sku: v.sku,
        size: v.size,
        color: v.color,
        image: primary?.url ?? null,
        unitPrice: price,
        originalUnitPrice: original > price ? original : price,
        quantity,
        lineTotal: price * quantity,
      });
    }

    const totals = computeTotals(items.map((i) => ({ price: i.unitPrice, originalPrice: i.originalUnitPrice, quantity: i.quantity })), settings);
    const now = new Date().toISOString();
    const history: StatusHistoryEntry[] = [
      { kind: "fulfillment", status: "placed", at: now, by: `customer:${input.uid}` },
      { kind: "payment", status: "pending", at: now, by: "system" },
    ];

    for (const [productId, variants] of newVariants) {
      tx.update(db.collection("products").doc(productId), {
        variants,
        totalStock: variants.reduce((n, v) => n + v.stock, 0),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    const doc = {
      userId: input.uid,
      items,
      address: input.address,
      contact: { name: input.address.fullName, email: input.email, phone: input.contactPhone },
      ...totals,
      paymentMethod: "cod" as const,
      paymentStatus: "pending" as const,
      status: "placed" as const,
      statusHistory: history,
      notified: {},
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };
    tx.set(orderRef, doc);
    tx.delete(cartRef);
    return { order: toOrder(orderId, { ...doc, createdAt: now, updatedAt: now }), created: true };
  });

  if (result.created) {
    // Notification failures are swallowed inside: the order is already saved and must be reported as placed.
    await notifyOrderOnce(orderId, "placed", orderMessage("New order", result.order));
    for (const c of lowStockCrossings) {
      await sendTelegram(`Low stock alert\n${c.name} (${c.sku}) now has ${c.stock} left.`);
    }
  }
  return result;
}

export function orderMessage(title: string, o: Order): string {
  return [
    `${title}: ${o.id}`,
    `Total: ${formatINR(o.total)}`,
    `Payment: ${o.paymentMethod.toUpperCase()} (${o.paymentStatus})`,
    `Status: ${o.status}`,
    `Items: ${o.items.reduce((n, i) => n + i.quantity, 0)}`,
    `Customer: ${o.contact.name}, ${o.address.city}`,
  ].join("\n");
}

interface TransitionInput {
  orderId: string;
  actor: string; // "admin:<uid>" | "customer:<uid>"
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  note?: string;
  /** When set, the order must belong to this user and the customer cancel rule applies. */
  customerUid?: string;
}

export async function transitionOrder(input: TransitionInput): Promise<Order> {
  const db = adminDb();
  const ref = db.collection("orders").doc(input.orderId);
  const events: { key: string; title: string }[] = [];

  const order = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new HttpError(404, "Order not found.");
    const d = snap.data()!;
    if (input.customerUid) {
      if (d.userId !== input.customerUid) throw new HttpError(404, "Order not found.");
      if (input.status !== "cancelled" || input.paymentStatus) throw new HttpError(403, "Customers can only cancel orders.");
      if (!customerCanCancel(d.status)) throw new HttpError(409, "This order can no longer be cancelled online. Please contact support.");
    }
    const now = new Date().toISOString();
    const history = [...(d.statusHistory ?? [])] as StatusHistoryEntry[];
    const updates: Record<string, unknown> = {};

    if (input.status && input.status !== d.status) {
      if (!canTransitionStatus(d.status, input.status)) throw new HttpError(409, `Cannot change order status from "${d.status}" to "${input.status}".`);
      updates.status = input.status;
      history.push({ kind: "fulfillment", status: input.status, at: now, by: input.actor, ...(input.note ? { note: input.note } : {}) });
      events.push({ key: `status_${input.status}`, title: input.status === "cancelled" ? "Order cancelled" : `Order ${input.status}` });

      if (input.status === "cancelled") {
        // Return stock. Read every product first, then write.
        const items = d.items as OrderItem[];
        const ids = [...new Set(items.map((i) => i.productId))];
        const psnaps = ids.length ? await tx.getAll(...ids.map((id) => db.collection("products").doc(id))) : [];
        for (const ps of psnaps) {
          if (!ps.exists) continue;
          const variants = (ps.get("variants") as { sku: string; stock: number }[]).map((v) => ({ ...v }));
          for (const it of items.filter((i) => i.productId === ps.id)) {
            const v = variants.find((x) => x.sku === it.sku);
            if (v) v.stock += it.quantity;
          }
          tx.update(ps.ref, { variants, totalStock: variants.reduce((n, v) => n + v.stock, 0), updatedAt: FieldValue.serverTimestamp() });
        }
      }
    }
    if (input.paymentStatus && input.paymentStatus !== d.paymentStatus) {
      if (!canTransitionPayment(d.paymentStatus, input.paymentStatus)) throw new HttpError(409, `Cannot change payment status from "${d.paymentStatus}" to "${input.paymentStatus}".`);
      updates.paymentStatus = input.paymentStatus;
      history.push({ kind: "payment", status: input.paymentStatus, at: now, by: input.actor, ...(input.note ? { note: input.note } : {}) });
      events.push({ key: `payment_${input.paymentStatus}`, title: input.paymentStatus === "paid" ? "Payment received" : `Payment ${input.paymentStatus}` });
    }
    if (Object.keys(updates).length === 0) throw new HttpError(400, "No change to apply.");

    tx.update(ref, { ...updates, statusHistory: history, updatedAt: FieldValue.serverTimestamp() });
    return toOrder(snap.id, { ...d, ...updates, statusHistory: history, updatedAt: now });
  });

  if (isTelegramConfigured()) {
    for (const e of events) await notifyOrderOnce(order.id, e.key, orderMessage(e.title, order));
  }
  return order;
}

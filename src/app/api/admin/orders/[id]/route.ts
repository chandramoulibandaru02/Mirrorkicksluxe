import { handle, json, readJson } from "@/lib/server/http";
import { requireAdmin } from "@/lib/server/session";
import { orderUpdateSchema } from "@/lib/schemas";
import { transitionOrder } from "@/lib/server/orders";
import type { OrderStatus, PaymentStatus } from "@/lib/types";
import { adminDb } from "@/lib/server/firebase-admin";
export const PATCH = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const admin = await requireAdmin();
  const { id } = await ctx.params;
  const data = orderUpdateSchema.parse(await readJson(req));
  const order = await transitionOrder({
    orderId: id,
    actor: `admin:${admin.uid}`,
    status: data.status as OrderStatus | undefined,
    paymentStatus: data.paymentStatus as PaymentStatus | undefined,
    note: data.note,
  });
  return json({ order });
});
export const DELETE = handle(
  async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
    await requireAdmin();
    const { id } = await ctx.params;

    await adminDb().collection("orders").doc(id).delete();

    return json({ success: true });
  }
);
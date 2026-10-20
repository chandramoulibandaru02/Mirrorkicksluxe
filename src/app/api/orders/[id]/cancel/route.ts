import { handle, json, assertSameOrigin } from "@/lib/server/http";
import { requireUser } from "@/lib/server/session";
import { transitionOrder } from "@/lib/server/orders";
import { requireAdmin } from "@/lib/server/session";  
import { adminDb } from "@/lib/server/firebase-admin";
export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  assertSameOrigin(req);
  const s = await requireUser();
  const { id } = await ctx.params;
  const order = await transitionOrder({ orderId: id, actor: `customer:${s.uid}`, status: "cancelled", customerUid: s.uid, note: "Cancelled by customer" });
  return json({ status: order.status });
});
export const DELETE = handle(
  async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
    const admin = await requireAdmin();
    const { id } = await ctx.params;

    await adminDb().collection("orders").doc(id).delete();

    return json({ success: true });
  }
);


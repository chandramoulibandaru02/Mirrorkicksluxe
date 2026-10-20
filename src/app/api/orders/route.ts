import { handle, json, readJson } from "@/lib/server/http";
import { requireUser } from "@/lib/server/session";
import { createOrderSchema } from "@/lib/schemas";
import { createOrder } from "@/lib/server/orders";

export const POST = handle(async (req: Request) => {
  const s = await requireUser();
  const data = createOrderSchema.parse(await readJson(req));
  const { order, created } = await createOrder({
    uid: s.uid,
    email: s.email,
    items: data.items,
    address: data.address,
    contactPhone: data.contactPhone,
    idempotencyKey: data.idempotencyKey,
  });
  return json({ orderId: order.id, created }, { status: created ? 201 : 200 });
});

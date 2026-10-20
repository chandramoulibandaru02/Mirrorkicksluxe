import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/server/firebase-admin";
import { handle, json, readJson } from "@/lib/server/http";
import { requireUser } from "@/lib/server/session";
import { cartItemsSchema } from "@/lib/schemas";

export const GET = handle(async () => {
  const s = await requireUser();
  const snap = await adminDb().collection("carts").doc(s.uid).get();
  return json({ items: snap.data()?.items ?? [] });
});

export const PUT = handle(async (req: Request) => {
  const s = await requireUser();
  const { items } = z.object({ items: cartItemsSchema }).parse(await readJson(req));
  await adminDb().collection("carts").doc(s.uid).set({ items, updatedAt: FieldValue.serverTimestamp() });
  return json({ ok: true });
});

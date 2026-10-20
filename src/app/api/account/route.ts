import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/server/firebase-admin";
import { handle, json, readJson } from "@/lib/server/http";
import { requireUser } from "@/lib/server/session";
import { addressSchema } from "@/lib/schemas";

const updateSchema = z.object({
  name: z.string().trim().min(2).max(80),
  phone: z.union([z.literal(""), z.string().trim().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number")]),
  addresses: z.array(addressSchema).max(5, "You can save up to 5 addresses"),
});

export const GET = handle(async () => {
  const s = await requireUser();
  const snap = await adminDb().collection("users").doc(s.uid).get();
  const d = snap.data() ?? {};
  return json({ name: d.name ?? s.name, email: s.email, phone: d.phone ?? "", addresses: d.addresses ?? [] });
});

export const PUT = handle(async (req: Request) => {
  const s = await requireUser();
  const data = updateSchema.parse(await readJson(req));
  // Explicit field list: a client can never write roles/claims through this endpoint.
  await adminDb().collection("users").doc(s.uid).set({ name: data.name, phone: data.phone, addresses: data.addresses, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  return json({ ok: true });
});

import { revalidateTag } from "next/cache";
import { adminDb } from "@/lib/server/firebase-admin";
import { handle, json, readJson, assertSameOrigin, HttpError } from "@/lib/server/http";
import { requireAdmin } from "@/lib/server/session";
import { categoryInputSchema } from "@/lib/schemas";

type Ctx = { params: Promise<{ id: string }> };

export const PUT = handle(async (req: Request, ctx: Ctx) => {
  await requireAdmin();
  const { id } = await ctx.params;
  const input = categoryInputSchema.parse(await readJson(req));
  const ref = adminDb().collection("categories").doc(id);
  if (!(await ref.get()).exists) throw new HttpError(404, "Category not found.");
  await ref.update(input); // slug stays stable so existing links keep working
  revalidateTag("categories", { expire: 0 });
  revalidateTag("products", { expire: 0 });
  return json({ ok: true });
});

export const DELETE = handle(async (req: Request, ctx: Ctx) => {
  assertSameOrigin(req);
  await requireAdmin();
  const { id } = await ctx.params;
  const used = await adminDb().collection("products").where("categoryId", "==", id).limit(1).get();
  if (!used.empty) throw new HttpError(409, "This category still has products. Move or delete them first.");
  await adminDb().collection("categories").doc(id).delete();
  revalidateTag("categories", { expire: 0 });
  return json({ ok: true });
});

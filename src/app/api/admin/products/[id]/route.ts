import { revalidateTag } from "next/cache";
import { z } from "zod";
import { handle, json, readJson, assertSameOrigin } from "@/lib/server/http";
import { requireAdmin } from "@/lib/server/session";
import { productInputSchema } from "@/lib/schemas";
import { deleteProduct, setProductStatus, updateProduct } from "@/lib/server/products-admin";

type Ctx = { params: Promise<{ id: string }> };

export const PUT = handle(async (req: Request, ctx: Ctx) => {
  await requireAdmin();
  const { id } = await ctx.params;
  const product = await updateProduct(id, productInputSchema.parse(await readJson(req)));
  revalidateTag("products", { expire: 0 });
  return json({ product });
});

export const PATCH = handle(async (req: Request, ctx: Ctx) => {
  await requireAdmin();
  const { id } = await ctx.params;
  const { status } = z.object({ status: z.enum(["draft", "published", "archived"]) }).parse(await readJson(req));
  await setProductStatus(id, status);
  revalidateTag("products", { expire: 0 });
  return json({ ok: true });
});

export const DELETE = handle(async (req: Request, ctx: Ctx) => {
  assertSameOrigin(req);
  await requireAdmin();
  const { id } = await ctx.params;
  await deleteProduct(id);
  revalidateTag("products", { expire: 0 });
  return json({ ok: true });
});

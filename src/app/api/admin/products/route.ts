import { revalidateTag } from "next/cache";
import { handle, json, readJson } from "@/lib/server/http";
import { requireAdmin } from "@/lib/server/session";
import { productInputSchema } from "@/lib/schemas";
import { createProduct } from "@/lib/server/products-admin";

export const POST = handle(async (req: Request) => {
  await requireAdmin();
  const input = productInputSchema.parse(await readJson(req));
  const product = await createProduct(input);
  revalidateTag("products", { expire: 0 });
  return json({ product }, { status: 201 });
});

import { revalidateTag } from "next/cache";
import { adminDb } from "@/lib/server/firebase-admin";
import { handle, json, readJson, HttpError } from "@/lib/server/http";
import { requireAdmin } from "@/lib/server/session";
import { categoryInputSchema } from "@/lib/schemas";
import { slugify } from "@/lib/pricing";

export const POST = handle(async (req: Request) => {
  await requireAdmin();
  const input = categoryInputSchema.parse(await readJson(req));
  const slug = slugify(input.name);
  if (!slug) throw new HttpError(400, "Category name must contain letters or numbers.");
  const dup = await adminDb().collection("categories").where("slug", "==", slug).limit(1).get();
  if (!dup.empty) throw new HttpError(409, "A category with this name already exists.");
  const ref = adminDb().collection("categories").doc();
  await ref.set({ ...input, slug });
  revalidateTag("categories", { expire: 0 });
  return json({ id: ref.id }, { status: 201 });
});

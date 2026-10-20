import { revalidatePath } from "next/cache";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/server/firebase-admin";
import { handle, json, readJson, HttpError } from "@/lib/server/http";
import { requireAdmin } from "@/lib/server/session";
import { pageContentSchema } from "@/lib/schemas";
import { EDITABLE_PAGES } from "@/lib/pages";

export const PUT = handle(async (req: Request, ctx: { params: Promise<{ slug: string }> }) => {
  await requireAdmin();
  const { slug } = await ctx.params;
  if (!(slug in EDITABLE_PAGES)) throw new HttpError(404, "Unknown page.");
  const data = pageContentSchema.parse(await readJson(req));
  await adminDb().collection("pages").doc(slug).set({ ...data, updatedAt: FieldValue.serverTimestamp() });
  revalidatePath(`/${slug}`);
  return json({ ok: true });
});

import { z } from "zod";
import { adminDb } from "@/lib/server/firebase-admin";
import { destroyImage, PRODUCT_FOLDER } from "@/lib/server/cloudinary";
import { handle, json, readJson } from "@/lib/server/http";
import { requireAdmin } from "@/lib/server/session";

/** Removes an image that was uploaded in the form but never saved. Refuses if any product references it. */
export const POST = handle(async (req: Request) => {
  await requireAdmin();
  const { publicId } = z.object({ publicId: z.string().startsWith(`${PRODUCT_FOLDER}/`).max(300) }).parse(await readJson(req));
  const refs = await adminDb().collection("products").where("imagePublicIds", "array-contains", publicId).limit(1).get();
  if (!refs.empty) return json({ deleted: false, reason: "in_use" });
  return json({ deleted: await destroyImage(publicId) });
});

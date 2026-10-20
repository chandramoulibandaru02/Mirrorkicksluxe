import { revalidatePath, revalidateTag } from "next/cache";
import { adminDb } from "@/lib/server/firebase-admin";
import { handle, json, readJson } from "@/lib/server/http";
import { requireAdmin } from "@/lib/server/session";
import { settingsSchema } from "@/lib/schemas";

export const PUT = handle(async (req: Request) => {
  await requireAdmin();
  const data = settingsSchema.parse(await readJson(req));
  await adminDb().collection("settings").doc("store").set(data);
  revalidateTag("settings", { expire: 0 });
  revalidatePath("/", "layout");
  return json({ ok: true });
});

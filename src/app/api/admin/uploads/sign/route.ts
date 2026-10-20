import { handle, json, assertSameOrigin, HttpError } from "@/lib/server/http";
import { requireAdmin } from "@/lib/server/session";
import { isCloudinaryConfigured, signUpload } from "@/lib/server/cloudinary";

export const POST = handle(async (req: Request) => {
  assertSameOrigin(req);
  await requireAdmin();
  if (!isCloudinaryConfigured()) throw new HttpError(503, "Image uploads are not configured. Set the Cloudinary environment variables.");
  return json(signUpload());
});

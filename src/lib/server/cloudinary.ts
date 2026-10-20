import "server-only";
import { v2 as cloudinary } from "cloudinary";

export const PRODUCT_FOLDER = "footwear/products";
export const ALLOWED_FORMATS = "jpg,jpeg,png,webp,avif";

function configured() {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) return null;
  cloudinary.config({ cloud_name: CLOUDINARY_CLOUD_NAME, api_key: CLOUDINARY_API_KEY, api_secret: CLOUDINARY_API_SECRET, secure: true });
  return { cloudName: CLOUDINARY_CLOUD_NAME, apiKey: CLOUDINARY_API_KEY, apiSecret: CLOUDINARY_API_SECRET };
}

/** Signed parameters for a direct browser -> Cloudinary upload. The API secret never leaves the server. */
export function signUpload() {
  const c = configured();
  if (!c) throw new Error("Cloudinary is not configured");
  const timestamp = Math.round(Date.now() / 1000);
  const params = { allowed_formats: ALLOWED_FORMATS, folder: PRODUCT_FOLDER, timestamp };
  const signature = cloudinary.utils.api_sign_request(params, c.apiSecret);
  return { cloudName: c.cloudName, apiKey: c.apiKey, timestamp, signature, folder: PRODUCT_FOLDER, allowedFormats: ALLOWED_FORMATS };
}

export async function destroyImage(publicId: string): Promise<boolean> {
  if (!configured() || !publicId.startsWith(`${PRODUCT_FOLDER}/`)) return false;
  try {
    const res = await cloudinary.uploader.destroy(publicId, { invalidate: true });
    return res.result === "ok" || res.result === "not found";
  } catch (e) {
    console.error("[cloudinary] destroy failed", publicId, e instanceof Error ? e.message : e);
    return false;
  }
}

export const isCloudinaryConfigured = () => configured() !== null;

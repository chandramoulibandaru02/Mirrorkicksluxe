
export const SITE_NAME =
  process.env.NEXT_PUBLIC_SITE_NAME || "MirrorKicksLuxe";

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
).replace(/\/+$/, "");

export const CLOUD_NAME =
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "";

export const CURRENCY = "INR";
export const AUDIENCES = ["men", "women", "kids", "unisex"] as const;
export const AUDIENCE_LABEL: Record<(typeof AUDIENCES)[number], string> = {
  men: "Men",
  women: "Women",
  kids: "Kids",
  unisex: "Unisex",
};

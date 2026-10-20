import type { StoreSettings } from "./types";

/** Discount percentage, only when the original price is genuinely higher than the selling price. */
export function discountPercent(price: number, originalPrice: number | null | undefined): number {
  if (!originalPrice || originalPrice <= price || price <= 0) return 0;
  return Math.round(((originalPrice - price) / originalPrice) * 100);
}

export function formatINR(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export interface TotalsInput {
  price: number;
  originalPrice: number | null | undefined;
  quantity: number;
}

export interface Totals {
  mrpTotal: number;
  subtotal: number;
  savings: number;
  shipping: number;
  total: number;
}

/** All amounts are whole rupees, so integer arithmetic is exact. */
export function computeTotals(
  lines: TotalsInput[],
  settings: Pick<StoreSettings, "shippingFlat" | "freeShippingThreshold">,
): Totals {
  let mrpTotal = 0;
  let subtotal = 0;
  for (const l of lines) {
    const mrp = l.originalPrice && l.originalPrice > l.price ? l.originalPrice : l.price;
    mrpTotal += mrp * l.quantity;
    subtotal += l.price * l.quantity;
  }
  const free = settings.freeShippingThreshold > 0 && subtotal >= settings.freeShippingThreshold;
  const shipping = subtotal === 0 || free ? 0 : settings.shippingFlat;
  return { mrpTotal, subtotal, savings: mrpTotal - subtotal, shipping, total: subtotal + shipping };
}

/** Cloudinary delivery URL with automatic format/quality and a width cap. */
export function cldUrl(url: string, width = 800): string {
  const marker = "/upload/";
  const i = url.indexOf(marker);
  if (i === -1 || !url.includes("res.cloudinary.com")) return url;
  return `${url.slice(0, i + marker.length)}f_auto,q_auto,c_limit,w_${width}/${url.slice(i + marker.length)}`;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

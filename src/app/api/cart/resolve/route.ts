import { z } from "zod";
import { handle, json, readJson } from "@/lib/server/http";
import { cartItemsSchema } from "@/lib/schemas";
import { getPublishedProducts } from "@/lib/server/catalog";
import { getSettings } from "@/lib/server/settings";
import { computeTotals } from "@/lib/pricing";
import type { CartLine } from "@/lib/types";

/** Turns raw cart items into display lines using CURRENT database prices and stock. Public data only. */
export const POST = handle(async (req: Request) => {
  const { items } = z.object({ items: cartItemsSchema }).parse(await readJson(req));
  const products = new Map((await getPublishedProducts()).map((p) => [p.id, p]));
  const lines: CartLine[] = items.map((it) => {
    const p = products.get(it.productId);
    const v = p?.variants.find((x) => x.sku === it.sku);
    if (!p || !v) {
      return { productId: it.productId, sku: it.sku, slug: "", name: "Item no longer available", brand: "", image: null, size: "", color: "", price: 0, originalPrice: 0, stock: 0, quantity: it.quantity, available: false };
    }
    const img = p.images.find((i) => i.isPrimary) ?? p.images[0];
    return {
      productId: p.id,
      sku: v.sku,
      slug: p.slug,
      name: p.name,
      brand: p.brand,
      image: img?.url ?? null,
      size: v.size,
      color: v.color,
      price: p.price,
      originalPrice: p.originalPrice && p.originalPrice > p.price ? p.originalPrice : p.price,
      stock: v.stock,
      quantity: Math.min(it.quantity, Math.max(v.stock, 0)) || it.quantity,
      available: v.stock > 0,
    };
  });
  const settings = await getSettings();
  const ok = lines.filter((l) => l.available && l.quantity <= l.stock);
  const totals = computeTotals(ok.map((l) => ({ price: l.price, originalPrice: l.originalPrice, quantity: l.quantity })), settings);
  return json({ lines, totals, codEnabled: settings.codEnabled, freeShippingThreshold: settings.freeShippingThreshold });
});

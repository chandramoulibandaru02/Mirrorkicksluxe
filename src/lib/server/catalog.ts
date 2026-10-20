import "server-only";
import { unstable_cache } from "next/cache";
import type { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "./firebase-admin";
import type { Category, Product } from "../types";

const iso = (t: unknown): string => (t && typeof (t as Timestamp).toDate === "function" ? (t as Timestamp).toDate().toISOString() : typeof t === "string" ? t : new Date(0).toISOString());

export function toProduct(id: string, d: FirebaseFirestore.DocumentData): Product {
  return {
    id,
    name: d.name,
    slug: d.slug,
    brand: d.brand,
    sku: d.sku,
    description: d.description ?? "",
    categoryId: d.categoryId,
    audience: d.audience,
    price: d.price,
    originalPrice: d.originalPrice ?? null,
    images: [...(d.images ?? [])].sort((a: { sortOrder: number }, b: { sortOrder: number }) => a.sortOrder - b.sortOrder),
    imagePublicIds: d.imagePublicIds ?? [],
    variants: d.variants ?? [],
    attributes: d.attributes ?? [],
    status: d.status,
    featured: Boolean(d.featured),
    sizes: d.sizes ?? [],
    colors: d.colors ?? [],
    totalStock: d.totalStock ?? 0,
    createdAt: iso(d.createdAt),
    updatedAt: iso(d.updatedAt),
  };
}

export function toCategory(id: string, d: FirebaseFirestore.DocumentData): Category {
  return { id, name: d.name, slug: d.slug, sortOrder: d.sortOrder ?? 0, isPublic: d.isPublic !== false };
}

/** All published products. Cached for a minute and invalidated by admin writes via the "products" tag. */
export const getPublishedProducts = unstable_cache(
  async (): Promise<Product[]> => {
    const snap = await adminDb().collection("products").where("status", "==", "published").get();
    return snap.docs.map((d) => toProduct(d.id, d.data()));
  },
  ["published-products"],
  { tags: ["products"], revalidate: 60 },
);

export const getPublicCategories = unstable_cache(
  async (): Promise<Category[]> => {
    const snap = await adminDb().collection("categories").get();
    return snap.docs
      .map((d) => toCategory(d.id, d.data()))
      .filter((c) => c.isPublic)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  },
  ["public-categories"],
  { tags: ["categories"], revalidate: 300 },
);

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const all = await getPublishedProducts();
  return all.find((p) => p.slug === slug) ?? null;
}

export function relatedProducts(all: Product[], p: Product, limit = 8): Product[] {
  return all
    .filter((x) => x.id !== p.id && (x.categoryId === p.categoryId || x.brand === p.brand))
    .sort((a, b) => Number(b.categoryId === p.categoryId) - Number(a.categoryId === p.categoryId) || b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

/** Loads the public catalogue; never throws so pages can render a clear error state. */
export async function loadCatalog(): Promise<{ products: Product[]; categories: Category[]; error: boolean }> {
  try {
    const [products, categories] = await Promise.all([getPublishedProducts(), getPublicCategories()]);
    return { products, categories, error: false };
  } catch (e) {
    console.error("[catalog] load failed", e instanceof Error ? e.message : e);
    return { products: [], categories: [], error: true };
  }
}

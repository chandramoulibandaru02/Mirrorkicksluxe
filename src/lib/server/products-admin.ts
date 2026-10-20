import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "./firebase-admin";
import { destroyImage } from "./cloudinary";
import { HttpError } from "./http";
import { slugify } from "../pricing";
import type { ProductInput } from "../schemas";
import { toProduct } from "./catalog";
import type { Product } from "../types";

const products = () => adminDb().collection("products");

function normaliseImages(images: ProductInput["images"]) {
  const sorted = [...images].sort((a, b) => a.sortOrder - b.sortOrder);
  let primary = sorted.findIndex((i) => i.isPrimary);
  if (primary === -1) primary = 0;
  return sorted.map((img, i) => ({ ...img, alt: img.alt, sortOrder: i, isPrimary: i === primary }));
}

function denormalise(input: ProductInput) {
  const images = normaliseImages(input.images);
  return {
    name: input.name,
    brand: input.brand,
    sku: input.sku,
    description: input.description,
    categoryId: input.categoryId,
    audience: input.audience,
    price: input.price,
    originalPrice: input.originalPrice,
    images,
    imagePublicIds: images.map((i) => i.publicId),
    variants: input.variants,
    attributes: input.attributes,
    status: input.status,
    featured: input.featured,
    sizes: [...new Set(input.variants.map((v) => v.size))],
    colors: [...new Set(input.variants.map((v) => v.color))],
    totalStock: input.variants.reduce((n, v) => n + v.stock, 0),
  };
}

async function assertCategoryExists(id: string) {
  const c = await adminDb().collection("categories").doc(id).get();
  if (!c.exists) throw new HttpError(400, "Selected category does not exist.", { fields: { categoryId: "Choose a valid category" } });
}

async function assertSkuFree(sku: string, exceptId?: string) {
  const q = await products().where("sku", "==", sku).limit(2).get();
  if (q.docs.some((d) => d.id !== exceptId)) throw new HttpError(409, `SKU "${sku}" is already used by another product.`);
}

async function uniqueSlug(name: string, exceptId?: string): Promise<string> {
  const base = slugify(name) || "product";
  for (let i = 0; i < 20; i++) {
    const slug = i === 0 ? base : `${base}-${i + 1}`;
    const q = await products().where("slug", "==", slug).limit(2).get();
    if (!q.docs.some((d) => d.id !== exceptId)) return slug;
  }
  return `${base}-${Date.now().toString(36)}`;
}

/** Deletes Cloudinary images only when no product references them any more. */
export async function cleanupUnreferencedImages(publicIds: string[], exceptProductId?: string) {
  for (const pid of new Set(publicIds)) {
    const q = await products().where("imagePublicIds", "array-contains", pid).limit(3).get();
    if (q.docs.every((d) => d.id === exceptProductId)) await destroyImage(pid);
  }
}

export async function createProduct(input: ProductInput): Promise<Product> {
  await assertCategoryExists(input.categoryId);
  await assertSkuFree(input.sku);
  const slug = await uniqueSlug(input.name);
  const ref = products().doc();
  await ref.set({ ...denormalise(input), slug, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
  return toProduct(ref.id, (await ref.get()).data()!);
}

export async function updateProduct(id: string, input: ProductInput): Promise<Product> {
  await assertCategoryExists(input.categoryId);
  await assertSkuFree(input.sku, id);
  const ref = products().doc(id);
  const before = await adminDb().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new HttpError(404, "Product not found.");
    tx.update(ref, { ...denormalise(input), updatedAt: FieldValue.serverTimestamp() });
    return snap.data()!;
  });
  const next = new Set(input.images.map((i) => i.publicId));
  const removed = ((before.imagePublicIds ?? []) as string[]).filter((p) => !next.has(p));
  if (removed.length) await cleanupUnreferencedImages(removed, id);
  return toProduct(id, (await ref.get()).data()!);
}

export async function setProductStatus(id: string, status: "draft" | "published" | "archived") {
  const ref = products().doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpError(404, "Product not found.");
  const d = snap.data()!;
  if (status === "published" && ((d.images ?? []).length === 0 || (d.variants ?? []).length === 0)) {
    throw new HttpError(400, "Add at least one image and one variant before publishing.");
  }
  await ref.update({ status, updatedAt: FieldValue.serverTimestamp() });
}

export async function deleteProduct(id: string) {
  const ref = products().doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpError(404, "Product not found.");
  const ids = (snap.data()!.imagePublicIds ?? []) as string[];
  await ref.delete();
  await cleanupUnreferencedImages(ids, id);
}

export async function getProductById(id: string): Promise<Product | null> {
  const s = await products().doc(id).get();
  return s.exists ? toProduct(s.id, s.data()!) : null;
}

import { notFound } from "next/navigation";
import { adminDb } from "@/lib/server/firebase-admin";
import { requireAdminPage } from "@/lib/server/session";
import { getProductById } from "@/lib/server/products-admin";
import { toCategory } from "@/lib/server/catalog";
import { ProductForm } from "@/components/admin/product-form";

export const metadata = { title: "Edit product" };

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage();
  const { id } = await params;
  const [product, cs] = await Promise.all([getProductById(id), adminDb().collection("categories").get()]);
  if (!product) notFound();
  const categories = cs.docs.map((d) => toCategory(d.id, d.data())).sort((a, b) => a.name.localeCompare(b.name));
  return <ProductForm key={product.id + product.updatedAt} product={product} categories={categories} />;
}

import { adminDb } from "@/lib/server/firebase-admin";
import { requireAdminPage } from "@/lib/server/session";
import { toCategory } from "@/lib/server/catalog";
import { ProductForm } from "@/components/admin/product-form";

export const metadata = { title: "Add product" };

export default async function NewProductPage() {
  await requireAdminPage();
  const cs = await adminDb().collection("categories").get();
  const categories = cs.docs.map((d) => toCategory(d.id, d.data())).sort((a, b) => a.name.localeCompare(b.name));
  return <ProductForm categories={categories} />;
}

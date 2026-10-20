import Link from "next/link";
import { Plus } from "lucide-react";
import { adminDb } from "@/lib/server/firebase-admin";
import { requireAdminPage } from "@/lib/server/session";
import { toCategory, toProduct } from "@/lib/server/catalog";
import { EmptyState } from "@/components/product-ui";
import { ProductsTable } from "@/components/admin/products-table";
import type { Category, Product } from "@/lib/types";

export const metadata = { title: "Products" };

export default async function AdminProductsPage() {
  await requireAdminPage();
  let data: { products: Product[]; categories: Category[] } | null = null;
  try {
    const [ps, cs] = await Promise.all([adminDb().collection("products").orderBy("createdAt", "desc").limit(500).get(), adminDb().collection("categories").get()]);
    data = {
      products: ps.docs.map((d) => toProduct(d.id, d.data())),
      categories: cs.docs.map((d) => toCategory(d.id, d.data())),
    };
  } catch (e) {
    console.error("[admin] products load failed", e instanceof Error ? e.message : e);
  }
  if (!data) return <EmptyState title="Could not load products">Check the Firebase configuration and try again.</EmptyState>;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">Products</h1>
        <Link href="/admin/products/new" className="btn btn-primary"><Plus size={18} aria-hidden /> Add product</Link>
      </div>
      {data.products.length === 0 ? <EmptyState title="No products yet">Add your first product to start selling.</EmptyState> : <ProductsTable products={data.products} categories={data.categories} />}
    </div>
  );
}

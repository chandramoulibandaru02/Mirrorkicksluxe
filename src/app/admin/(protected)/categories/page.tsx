import { adminDb } from "@/lib/server/firebase-admin";
import { requireAdminPage } from "@/lib/server/session";
import { toCategory } from "@/lib/server/catalog";
import { EmptyState } from "@/components/product-ui";
import { CategoriesManager } from "@/components/admin/categories-manager";
import type { Category } from "@/lib/types";

export const metadata = { title: "Categories" };

export default async function AdminCategoriesPage() {
  await requireAdminPage();
  let data: { categories: Category[]; counts: Record<string, number> } | null = null;
  try {
    const db = adminDb();
    const snap = await db.collection("categories").get();
    const categories = snap.docs.map((d) => toCategory(d.id, d.data())).sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
    const counts = await Promise.all(categories.map(async (c) => (await db.collection("products").where("categoryId", "==", c.id).count().get()).data().count));
    data = { categories, counts: Object.fromEntries(categories.map((c, i) => [c.id, counts[i]])) };
  } catch (e) {
    console.error("[admin] categories load failed", e instanceof Error ? e.message : e);
  }
  if (!data) return <EmptyState title="Could not load categories">Check the Firebase configuration and try again.</EmptyState>;
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Categories</h1>
      <CategoriesManager categories={data.categories} productCounts={data.counts} />
    </div>
  );
}

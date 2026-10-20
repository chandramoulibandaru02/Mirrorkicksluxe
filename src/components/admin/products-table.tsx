"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client-api";
import { formatINR } from "@/lib/pricing";
import type { Category, Product, ProductStatus } from "@/lib/types";
import { StatusBadge } from "@/components/status-badge";
import { cldUrl } from "@/lib/pricing";

export function ProductsTable({ products, categories }: { products: Product[]; categories: Category[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | ProductStatus>("all");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const catName = (id: string) => categories.find((c) => c.id === id)?.name ?? "—";

  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    return products.filter((p) => (status === "all" || p.status === status) && (!t || `${p.name} ${p.brand} ${p.sku}`.toLowerCase().includes(t)));
  }, [products, q, status]);

  async function run(id: string, fn: () => Promise<unknown>) {
    setBusy(id);
    setError("");
    try {
      await fn();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <label className="sr-only" htmlFor="pt-q">Search products</label>
        <input id="pt-q" type="search" className="field max-w-xs" placeholder="Search name, brand or SKU" value={q} onChange={(e) => setQ(e.target.value)} />
        <label className="sr-only" htmlFor="pt-s">Filter by status</label>
        <select id="pt-s" className="field w-auto" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
          <option value="all">All statuses</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </select>
      </div>
      {error && <p role="alert" className="text-sm font-semibold text-danger">{error}</p>}
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[46rem] text-left text-sm">
          <thead className="border-b border-line bg-page">
            <tr><th className="p-2.5">Product</th><th className="p-2.5">Category</th><th className="p-2.5">Price</th><th className="p-2.5">Stock</th><th className="p-2.5">Status</th><th className="p-2.5">Actions</th></tr>
          </thead>
          <tbody>
            {rows.map((p) => {
              const img = p.images.find((i) => i.isPrimary) ?? p.images[0];
              return (
                <tr key={p.id} className="border-b border-line last:border-0">
                  <td className="p-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="size-12 shrink-0 bg-white">{img && (
                          // Small Cloudinary thumbnail, already resized by cldUrl().
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={cldUrl(img.url, 100)} alt="" className="size-full object-contain" />
                        )}</div>
                      <div className="min-w-0">
                        <Link href={`/admin/products/${p.id}`} className="font-semibold text-brand hover:underline">{p.name}</Link>
                        <p className="text-xs text-muted">{p.brand} · {p.sku}{p.featured ? " · Featured" : ""}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-2.5">{catName(p.categoryId)}</td>
                  <td className="p-2.5">{formatINR(p.price)}</td>
                  <td className="p-2.5">{p.totalStock}</td>
                  <td className="p-2.5"><StatusBadge status={p.status} /></td>
                  <td className="p-2.5">
                    <div className="flex flex-wrap gap-1.5">
                      <Link href={`/admin/products/${p.id}`} className="btn btn-outline btn-sm">Edit</Link>
                      {p.status !== "published" && <button type="button" className="btn btn-outline btn-sm" disabled={busy === p.id} onClick={() => run(p.id, () => api(`/api/admin/products/${p.id}`, { method: "PATCH", body: { status: "published" } }))}>Publish</button>}
                      {p.status === "published" && <button type="button" className="btn btn-outline btn-sm" disabled={busy === p.id} onClick={() => run(p.id, () => api(`/api/admin/products/${p.id}`, { method: "PATCH", body: { status: "draft" } }))}>Unpublish</button>}
                      {p.status !== "archived" && <button type="button" className="btn btn-outline btn-sm" disabled={busy === p.id} onClick={() => window.confirm(`Archive "${p.name}"? It will be hidden from the store.`) && run(p.id, () => api(`/api/admin/products/${p.id}`, { method: "PATCH", body: { status: "archived" } }))}>Archive</button>}
                      <button type="button" className="btn btn-danger btn-sm" disabled={busy === p.id} onClick={() => window.confirm(`Permanently delete "${p.name}" and its images? Past orders keep their own copy of the item details. This cannot be undone.`) && run(p.id, () => api(`/api/admin/products/${p.id}`, { method: "DELETE" }))}>Delete</button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-muted">No products match.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { api, type ApiError } from "@/lib/client-api";
import type { Category } from "@/lib/types";

interface Draft {
  name: string;
  sortOrder: string;
  isPublic: boolean;
}

const blank: Draft = { name: "", sortOrder: "0", isPublic: true };

export function CategoriesManager({ categories, productCounts }: { categories: Category[]; productCounts: Record<string, number> }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(blank);
  const [editId, setEditId] = useState<string | null>(null);
  const [edit, setEdit] = useState<Draft>(blank);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function run(key: string, fn: () => Promise<unknown>, after?: () => void) {
    setBusy(key);
    setError("");
    try {
      await fn();
      after?.();
      router.refresh();
    } catch (e) {
      const err = e as ApiError;
      setError(err.fields ? Object.values(err.fields)[0] : err.message || "Something went wrong.");
    } finally {
      setBusy(null);
    }
  }

  const body = (d: Draft) => ({ name: d.name.trim(), sortOrder: Number.parseInt(d.sortOrder || "0", 10) || 0, isPublic: d.isPublic });

  return (
    <div className="space-y-4">
      {error && <p role="alert" className="rounded-[3px] border border-danger bg-red-50 p-3 text-sm text-danger">{error}</p>}

      <form
        className="card grid gap-3 p-4 sm:grid-cols-[1fr_8rem_auto_auto] sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          void run("add", () => api("/api/admin/categories", { method: "POST", body: body(draft) }), () => setDraft(blank));
        }}
      >
        <div>
          <label htmlFor="cat-name" className="label">New category name</label>
          <input id="cat-name" className="field" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} maxLength={60} required minLength={2} />
        </div>
        <div>
          <label htmlFor="cat-order" className="label">Display order</label>
          <input id="cat-order" className="field" inputMode="numeric" value={draft.sortOrder} onChange={(e) => setDraft({ ...draft, sortOrder: e.target.value.replace(/\D/g, "") })} />
        </div>
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input type="checkbox" className="size-4 accent-brand" checked={draft.isPublic} onChange={(e) => setDraft({ ...draft, isPublic: e.target.checked })} />
          Visible in store
        </label>
        <button type="submit" className="btn btn-primary" disabled={busy === "add"}>
          {busy === "add" ? <Loader2 className="animate-spin" size={18} aria-hidden /> : <Plus size={18} aria-hidden />} Add
        </button>
      </form>

      {categories.length === 0 ? (
        <p className="card p-6 text-center text-sm text-muted">No categories yet. Add one above; every product needs a category.</p>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-page">
              <tr><th className="p-2.5">Name</th><th className="p-2.5">Order</th><th className="p-2.5">Visibility</th><th className="p-2.5">Products</th><th className="p-2.5"><span className="sr-only">Actions</span></th></tr>
            </thead>
            <tbody>
              {categories.map((c) => {
                const count = productCounts[c.id] ?? 0;
                const editing = editId === c.id;
                return (
                  <tr key={c.id} className="border-b border-line align-middle last:border-0">
                    <td className="p-2.5">
                      {editing ? (
                        <>
                          <label htmlFor={`n-${c.id}`} className="sr-only">Category name</label>
                          <input id={`n-${c.id}`} className="field min-h-10" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} maxLength={60} />
                        </>
                      ) : (
                        <>
                          <span className="font-semibold">{c.name}</span> <span className="text-xs text-muted">/{c.slug}</span>
                        </>
                      )}
                    </td>
                    <td className="p-2.5">
                      {editing ? (
                        <>
                          <label htmlFor={`o-${c.id}`} className="sr-only">Display order</label>
                          <input id={`o-${c.id}`} className="field min-h-10 w-20" inputMode="numeric" value={edit.sortOrder} onChange={(e) => setEdit({ ...edit, sortOrder: e.target.value.replace(/\D/g, "") })} />
                        </>
                      ) : (
                        c.sortOrder
                      )}
                    </td>
                    <td className="p-2.5">
                      {editing ? (
                        <label className="flex items-center gap-2"><input type="checkbox" className="size-4 accent-brand" checked={edit.isPublic} onChange={(e) => setEdit({ ...edit, isPublic: e.target.checked })} /> Visible</label>
                      ) : c.isPublic ? "Visible" : "Hidden"}
                    </td>
                    <td className="p-2.5">{count}</td>
                    <td className="p-2.5">
                      <div className="flex justify-end gap-2">
                        {editing ? (
                          <>
                            <button type="button" className="btn btn-primary btn-sm" disabled={busy === c.id} onClick={() => void run(c.id, () => api(`/api/admin/categories/${c.id}`, { method: "PUT", body: body(edit) }), () => setEditId(null))}>
                              {busy === c.id && <Loader2 className="animate-spin" size={16} aria-hidden />} Save
                            </button>
                            <button type="button" className="btn btn-outline btn-sm" onClick={() => setEditId(null)}>Cancel</button>
                          </>
                        ) : (
                          <>
                            <button type="button" className="btn btn-outline btn-sm" onClick={() => { setEditId(c.id); setEdit({ name: c.name, sortOrder: String(c.sortOrder), isPublic: c.isPublic }); setError(""); }} aria-label={`Edit ${c.name}`}>
                              <Pencil size={16} aria-hidden /> Edit
                            </button>
                            <button
                              type="button"
                              className="btn btn-danger btn-sm"
                              disabled={count > 0 || busy === c.id}
                              title={count > 0 ? "Move or delete this category's products first" : undefined}
                              aria-label={`Delete ${c.name}`}
                              onClick={() => {
                                if (window.confirm(`Delete the category "${c.name}"? This cannot be undone.`)) void run(c.id, () => api(`/api/admin/categories/${c.id}`, { method: "DELETE" }));
                              }}
                            >
                              <Trash2 size={16} aria-hidden /> Delete
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

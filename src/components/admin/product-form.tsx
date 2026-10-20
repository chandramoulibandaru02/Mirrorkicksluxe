"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2, Wand2 } from "lucide-react";
import { api, type ApiError } from "@/lib/client-api";
import { AUDIENCES, AUDIENCE_LABEL } from "@/lib/brand";
import { cldUrl, discountPercent, formatINR } from "@/lib/pricing";
import type { Audience, Category, Product, ProductStatus } from "@/lib/types";
import { ImageUploader, type ImageItem } from "./image-uploader";

interface VariantRow { size: string; color: string; sku: string; stock: string }

function toImageItems(p?: Product): ImageItem[] {
  return (p?.images ?? []).map((i) => ({ key: i.publicId, url: i.url, publicId: i.publicId, alt: i.alt, isPrimary: i.isPrimary, isNew: false, status: "done" as const, progress: 100 }));
}

export function ProductForm({ product, categories }: { product?: Product; categories: Category[] }) {
  const router = useRouter();
  const [name, setName] = useState(product?.name ?? "");
  const [brand, setBrand] = useState(product?.brand ?? "");
  const [sku, setSku] = useState(product?.sku ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? "");
  const [audience, setAudience] = useState<Audience>(product?.audience ?? "unisex");
  const [price, setPrice] = useState(product ? String(product.price) : "");
  const [originalPrice, setOriginalPrice] = useState(product?.originalPrice ? String(product.originalPrice) : "");
  const [status, setStatus] = useState<ProductStatus>(product?.status ?? "draft");
  const [featured, setFeatured] = useState(product?.featured ?? false);
  const [attributes, setAttributes] = useState<{ key: string; value: string }[]>(product?.attributes ?? []);
  const [variants, setVariants] = useState<VariantRow[]>((product?.variants ?? []).map((v) => ({ ...v, stock: String(v.stock) })));
  const [images, setImages] = useState<ImageItem[]>(toImageItems(product));
  const [gen, setGen] = useState({ sizes: "", colors: "" });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);

  // Best-effort cleanup: images uploaded in this form but never saved are deleted when the form is left.
  const imagesRef = useRef(images);
  const savedRef = useRef(false);
  useEffect(() => {
    imagesRef.current = images;
  }, [images]);
  useEffect(
    () => () => {
      if (savedRef.current) return;
      for (const i of imagesRef.current) {
        if (i.isNew && i.publicId) {
          void fetch("/api/admin/uploads/delete", { method: "POST", keepalive: true, headers: { "content-type": "application/json" }, body: JSON.stringify({ publicId: i.publicId }) }).catch(() => undefined);
        }
      }
    },
    [],
  );

  const uploading = images.some((i) => i.status === "uploading");
  const failed = images.some((i) => i.status === "error");

  const payload = useMemo(() => {
    const ordered = images.filter((i) => i.status === "done");
    return {
      name, brand, sku, description, categoryId, audience, status, featured,
      price: price === "" ? 0 : Number(price),
      originalPrice: originalPrice === "" ? null : Number(originalPrice),
      images: ordered.map((i, idx) => ({ url: i.url, publicId: i.publicId, alt: i.alt || `${brand} ${name}`.trim(), sortOrder: idx, isPrimary: i.isPrimary })),
      variants: variants.map((v) => ({ size: v.size, color: v.color, sku: v.sku, stock: v.stock === "" ? 0 : Number(v.stock) })),
      attributes: attributes.filter((a) => a.key.trim() || a.value.trim()),
    };
  }, [name, brand, sku, description, categoryId, audience, status, featured, price, originalPrice, images, variants, attributes]);

  function clientValidate(): Record<string, string> {
    const e: Record<string, string> = {};
    if (name.trim().length < 2) e.name = "Name is required";
    if (!brand.trim()) e.brand = "Brand is required";
    if (!sku.trim()) e.sku = "SKU is required";
    if (!categoryId) e.categoryId = "Choose a category";
    if (!price || !Number.isInteger(Number(price)) || Number(price) < 1) e.price = "Enter the selling price in whole rupees";
    if (originalPrice !== "" && (!Number.isInteger(Number(originalPrice)) || Number(originalPrice) <= Number(price))) e.originalPrice = "Original price must be higher than the selling price, or left empty";
    variants.forEach((v, i) => {
      if (!v.size.trim()) e[`variants.${i}.size`] = "Required";
      if (!v.color.trim()) e[`variants.${i}.color`] = "Required";
      if (!v.sku.trim()) e[`variants.${i}.sku`] = "Required";
      if (v.stock === "" || !Number.isInteger(Number(v.stock)) || Number(v.stock) < 0) e[`variants.${i}.stock`] = "Whole number, 0 or more";
    });
    if (status === "published") {
      if (payload.images.length === 0) e.images = "Add at least one image before publishing";
      if (variants.length === 0) e.variants = "Add at least one size/colour variant before publishing";
    }
    return e;
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setFormError("");
    const errs = clientValidate();
    if (uploading) errs.images = "Wait for uploads to finish";
    else if (failed) errs.images = "Retry or remove the images that failed to upload";
    setFieldErrors(errs);
    if (Object.keys(errs).length) {
      setFormError("Please correct the highlighted fields.");
      return;
    }
    setSaving(true);
    try {
      if (product) await api(`/api/admin/products/${product.id}`, { method: "PUT", body: payload });
      else await api("/api/admin/products", { method: "POST", body: payload });
      savedRef.current = true;
      router.push("/admin/products");
      router.refresh();
    } catch (err) {
      const ae = err as ApiError;
      if (ae.fields) setFieldErrors(ae.fields);
      setFormError(ae.message);
      setSaving(false);
    }
  }

  function generate() {
    const sizes = gen.sizes.split(",").map((s) => s.trim()).filter(Boolean);
    const colors = gen.colors.split(",").map((s) => s.trim()).filter(Boolean);
    if (!sizes.length || !colors.length) return setFormError("Enter sizes and colours separated by commas to generate variants.");
    setFormError("");
    const have = new Set(variants.map((v) => `${v.size.toLowerCase()}|${v.color.toLowerCase()}`));
    const base = sku.trim() || "SKU";
    const added: VariantRow[] = [];
    for (const c of colors) for (const s of sizes) {
      if (have.has(`${s.toLowerCase()}|${c.toLowerCase()}`)) continue;
      added.push({ size: s, color: c, sku: `${base}-${c.replace(/\s+/g, "").toUpperCase().slice(0, 4)}-${s}`, stock: "0" });
    }
    setVariants((cur) => [...cur, ...added]);
  }

  const err = (k: string) => fieldErrors[k] && <p className="mt-1 text-sm text-danger" role="alert">{fieldErrors[k]}</p>;
  const invalid = (k: string) => (fieldErrors[k] ? true : undefined);
  const price_n = Number(price) || 0;
  const orig_n = originalPrice === "" ? null : Number(originalPrice);
  const primaryImg = images.find((i) => i.isPrimary) ?? images[0];

  return (
    <form onSubmit={save} className="space-y-5" noValidate>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">{product ? "Edit product" : "Add product"}</h1>
        <Link href="/admin/products" className="text-sm text-brand underline">Back to products</Link>
      </div>

      <section className="card space-y-4 p-4" aria-labelledby="basic-h">
        <h2 id="basic-h" className="text-base font-bold">Basic details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="p-name" className="label">Product name</label>
            <input id="p-name" className="field" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={invalid("name")} maxLength={150} />
            {err("name")}
          </div>
          <div>
            <label htmlFor="p-brand" className="label">Brand</label>
            <input id="p-brand" className="field" value={brand} onChange={(e) => setBrand(e.target.value)} aria-invalid={invalid("brand")} maxLength={80} />
            {err("brand")}
          </div>
          <div>
            <label htmlFor="p-sku" className="label">SKU</label>
            <input id="p-sku" className="field" value={sku} onChange={(e) => setSku(e.target.value)} aria-invalid={invalid("sku")} maxLength={60} />
            {err("sku")}
          </div>
          <div>
            <label htmlFor="p-cat" className="label">Category</label>
            <select id="p-cat" className="field" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} aria-invalid={invalid("categoryId")}>
              <option value="">Select a category</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {categories.length === 0 && <p className="mt-1 text-sm text-warn">No categories yet. <Link href="/admin/categories" className="underline">Create one first</Link>.</p>}
            {err("categoryId")}
          </div>
          <div>
            <label htmlFor="p-aud" className="label">Audience</label>
            <select id="p-aud" className="field" value={audience} onChange={(e) => setAudience(e.target.value as Audience)}>
              {AUDIENCES.map((a) => <option key={a} value={a}>{AUDIENCE_LABEL[a]}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="p-desc" className="label">Description</label>
            <textarea id="p-desc" className="field min-h-28" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={5000} />
            {err("description")}
          </div>
        </div>
      </section>

      <section className="card space-y-4 p-4" aria-labelledby="price-h">
        <h2 id="price-h" className="text-base font-bold">Pricing and visibility</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label htmlFor="p-price" className="label">Selling price (₹)</label>
            <input id="p-price" className="field" inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value.replace(/\D/g, ""))} aria-invalid={invalid("price")} />
            {err("price")}
          </div>
          <div>
            <label htmlFor="p-orig" className="label">Original price (₹) <span className="font-normal text-muted">optional</span></label>
            <input id="p-orig" className="field" inputMode="numeric" value={originalPrice} onChange={(e) => setOriginalPrice(e.target.value.replace(/\D/g, ""))} aria-invalid={invalid("originalPrice")} />
            {err("originalPrice")}
            {orig_n && orig_n > price_n && price_n > 0 && <p className="mt-1 text-xs text-ok">Shown as {discountPercent(price_n, orig_n)}% off</p>}
          </div>
          <div>
            <label htmlFor="p-status" className="label">Status</label>
            <select id="p-status" className="field" value={status} onChange={(e) => setStatus(e.target.value as ProductStatus)}>
              <option value="draft">Draft (hidden)</option>
              <option value="published">Published (visible)</option>
              <option value="archived">Archived (hidden)</option>
            </select>
          </div>
          <div className="flex items-end">
            <label className="flex min-h-11 items-center gap-2 text-sm font-semibold">
              <input type="checkbox" className="size-4 accent-brand" checked={featured} onChange={(e) => setFeatured(e.target.checked)} /> Featured on homepage
            </label>
          </div>
        </div>
      </section>

      <section className="card space-y-3 p-4" aria-labelledby="img-h">
        <h2 id="img-h" className="text-base font-bold">Images</h2>
        <ImageUploader images={images} onChange={(u) => setImages(u)} error={fieldErrors.images} />
      </section>

      <section className="card space-y-3 p-4" aria-labelledby="var-h">
        <h2 id="var-h" className="text-base font-bold">Sizes, colours and stock</h2>
        <div className="grid gap-2 rounded-[3px] bg-page p-3 sm:grid-cols-[1fr_1fr_auto]">
          <div>
            <label htmlFor="g-sizes" className="label">Sizes (comma separated)</label>
            <input id="g-sizes" className="field" placeholder="6, 7, 8, 9, 10" value={gen.sizes} onChange={(e) => setGen({ ...gen, sizes: e.target.value })} />
          </div>
          <div>
            <label htmlFor="g-colors" className="label">Colours (comma separated)</label>
            <input id="g-colors" className="field" placeholder="Black, Navy" value={gen.colors} onChange={(e) => setGen({ ...gen, colors: e.target.value })} />
          </div>
          <div className="flex items-end"><button type="button" className="btn btn-outline" onClick={generate}><Wand2 size={16} aria-hidden /> Add variants</button></div>
        </div>
        {err("variants")}
        {variants.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead><tr><th className="p-1.5">Size</th><th className="p-1.5">Colour</th><th className="p-1.5">Variant SKU</th><th className="p-1.5">Stock</th><th className="p-1.5"><span className="sr-only">Remove</span></th></tr></thead>
              <tbody>
                {variants.map((v, i) => {
                  const set = (k: keyof VariantRow, val: string) => setVariants((cur) => cur.map((x, j) => (j === i ? { ...x, [k]: val } : x)));
                  return (
                    <tr key={i}>
                      {(["size", "color", "sku", "stock"] as const).map((k) => (
                        <td key={k} className="p-1 align-top">
                          <input aria-label={`${k} for variant ${i + 1}`} className="field min-h-10" inputMode={k === "stock" ? "numeric" : undefined} value={v[k]} onChange={(e) => set(k, k === "stock" ? e.target.value.replace(/\D/g, "") : e.target.value)} aria-invalid={invalid(`variants.${i}.${k}`)} />
                          {err(`variants.${i}.${k}`)}
                        </td>
                      ))}
                      <td className="p-1 align-top"><button type="button" className="btn btn-danger btn-sm" onClick={() => setVariants((cur) => cur.filter((_, j) => j !== i))} aria-label={`Remove variant ${i + 1}`}><Trash2 size={16} aria-hidden /></button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <button type="button" className="btn btn-outline btn-sm" onClick={() => setVariants((c) => [...c, { size: "", color: "", sku: "", stock: "0" }])}><Plus size={16} aria-hidden /> Add one variant</button>
      </section>

      <section className="card space-y-3 p-4" aria-labelledby="attr-h">
        <h2 id="attr-h" className="text-base font-bold">Attributes <span className="text-sm font-normal text-muted">(for example Material: Leather)</span></h2>
        {attributes.map((a, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2">
            <input aria-label={`Attribute ${i + 1} name`} className="field" placeholder="Name" value={a.key} onChange={(e) => setAttributes((c) => c.map((x, j) => (j === i ? { ...x, key: e.target.value } : x)))} />
            <input aria-label={`Attribute ${i + 1} value`} className="field" placeholder="Value" value={a.value} onChange={(e) => setAttributes((c) => c.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} />
            <button type="button" className="btn btn-danger btn-sm self-center" onClick={() => setAttributes((c) => c.filter((_, j) => j !== i))} aria-label={`Remove attribute ${i + 1}`}><Trash2 size={16} aria-hidden /></button>
          </div>
        ))}
        <button type="button" className="btn btn-outline btn-sm" onClick={() => setAttributes((c) => [...c, { key: "", value: "" }])}><Plus size={16} aria-hidden /> Add attribute</button>
      </section>

      <section className="card p-4" aria-labelledby="prev-h">
        <div className="flex items-center justify-between">
          <h2 id="prev-h" className="text-base font-bold">Preview</h2>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => setPreview((p) => !p)} aria-expanded={preview}>{preview ? "Hide preview" : "Show preview"}</button>
        </div>
        {preview && (
          <div className="mt-3 flex max-w-md gap-3 rounded-[4px] border border-line p-3">
            <div className="size-28 shrink-0 bg-white">
              {primaryImg ? (
                // Plain <img>: previews can be local blob: URLs that next/image cannot optimise.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={primaryImg.preview || cldUrl(primaryImg.url, 300)} alt="" className="size-full object-contain" />
              ) : (
                <p className="p-2 text-xs text-muted">No image</p>
              )}
            </div>
            <div className="min-w-0 text-sm">
              <p className="text-xs font-semibold tracking-wide text-muted uppercase">{brand || "Brand"}</p>
              <p className="font-semibold">{name || "Product name"}</p>
              <p className="mt-1 font-bold">{formatINR(price_n)} {orig_n && orig_n > price_n && <><s className="font-normal text-muted">{formatINR(orig_n)}</s> <span className="text-ok">{discountPercent(price_n, orig_n)}% off</span></>}</p>
              <p className="mt-1 text-xs text-muted">{[...new Set(variants.map((v) => v.size).filter(Boolean))].join(", ") || "No sizes"} · Status: {status}</p>
            </div>
          </div>
        )}
      </section>

      {formError && <p role="alert" className="text-sm font-semibold text-danger">{formError}</p>}
      <div className="sticky bottom-0 -mx-4 flex gap-2 border-t border-line bg-page/95 p-3 sm:mx-0">
        <button type="submit" className="btn btn-primary" disabled={saving || uploading}>
          {(saving || uploading) && <Loader2 size={18} className="animate-spin" aria-hidden />}
          {uploading ? "Uploading images…" : saving ? "Saving…" : product ? "Save changes" : "Create product"}
        </button>
        <Link href="/admin/products" className="btn btn-outline">Cancel</Link>
      </div>
    </form>
  );
}

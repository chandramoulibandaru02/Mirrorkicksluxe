"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Maximize2, X, ZoomIn } from "lucide-react";
import { cldUrl } from "@/lib/pricing";
import type { Product } from "@/lib/types";
import { useCart, MAX_QTY } from "./cart-provider";
import { Price } from "./product-ui";

const loader = ({ src, width }: { src: string; width: number }) => cldUrl(src, width);
export function Gallery({ product }: { product: Product }) {
  const images = product.images;
  const primaryIdx = Math.max(0, images.findIndex((i) => i.isPrimary));
  const [idx, setIdx] = useState(primaryIdx);
  const [zoomed, setZoomed] = useState(false);
  const [enlarged, setEnlarged] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (enlarged && !d.open) d.showModal();
    if (!enlarged && d.open) d.close();
  }, [enlarged]);

  if (images.length === 0) return <div className="card flex aspect-square items-center justify-center text-muted">No image available</div>;
  const current = images[idx] ?? images[0];

  return (
    <div className="flex flex-col-reverse gap-3 sm:flex-row">
      {images.length > 1 && (
        <ul className="flex gap-2 overflow-x-auto sm:max-h-[32rem] sm:flex-col sm:overflow-y-auto sm:overflow-x-visible" aria-label="Product images">
          {images.map((img, i) => (
            <li key={img.publicId} className="shrink-0">
              <button type="button" onClick={() => setIdx(i)} aria-label={`Show image ${i + 1} of ${images.length}`} aria-current={i === idx ? "true" : undefined} className={`relative block size-16 overflow-hidden rounded-[3px] border bg-white sm:size-[4.5rem] ${i === idx ? "border-brand ring-1 ring-brand" : "border-line"}`}>
                <Image   src={img.url} alt="" fill sizes="72px" className="object-contain p-0.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="relative min-w-0 flex-1">
        <div
          className={`card relative aspect-square overflow-hidden bg-white ${zoomed ? "cursor-zoom-out" : "cursor-zoom-in"}`}
          onClick={() => setZoomed((z) => !z)}
          onMouseLeave={() => setZoomed(false)}
          onMouseMove={(e) => {
            if (!zoomed) return;
            const r = e.currentTarget.getBoundingClientRect();
            const img = e.currentTarget.querySelector("img");
            if (img) img.style.transformOrigin = `${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`;
          }}
        >
          <Image
             
            src={current.url}
            alt={current.alt || `${product.brand} ${product.name}`}
            fill
            priority
            sizes="(min-width:1024px) 40vw, 100vw"
            className="object-contain p-3 transition-none"
            style={{ transform: zoomed ? "scale(2)" : "none" }}
          />
        </div>
        <button type="button" onClick={() => setEnlarged(true)} className="btn btn-outline btn-sm absolute top-2 right-2 bg-white" aria-label="Open enlarged image">
          <Maximize2 size={16} aria-hidden />
          <span className="hidden sm:inline">Enlarge</span>
        </button>
        <p className="mt-1 flex items-center gap-1 text-xs text-muted max-sm:hidden">
          <ZoomIn size={14} aria-hidden /> Click the image to zoom
        </p>
      </div>

      <dialog ref={dialogRef} onClose={() => setEnlarged(false)} onClick={(e) => e.target === dialogRef.current && setEnlarged(false)} className="m-auto max-h-[96dvh] w-[96vw] max-w-4xl bg-white p-0 backdrop:bg-black/70" aria-label={`${product.name} enlarged images`}>
        <div className="flex items-center justify-between border-b border-line p-2">
          <p className="px-2 text-sm font-semibold">
            {product.name} ({idx + 1}/{images.length})
          </p>
          <button type="button" onClick={() => setEnlarged(false)} className="flex size-10 items-center justify-center" aria-label="Close enlarged image">
            <X size={20} aria-hidden />
          </button>
        </div>
        <div className="relative h-[70dvh] bg-white">
          {enlarged && <Image   src={current.url} alt={current.alt || product.name} fill sizes="96vw" className="object-contain" />}
        </div>
        {images.length > 1 && (
          <div className="flex justify-center gap-2 border-t border-line p-2">
            {images.map((img, i) => (
              <button key={img.publicId} type="button" onClick={() => setIdx(i)} aria-label={`Show image ${i + 1}`} className={`relative size-12 border ${i === idx ? "border-brand" : "border-line"}`}>
                <Image   src={img.url} alt="" fill sizes="48px" className="object-contain" />
              </button>
            ))}
          </div>
        )}
      </dialog>
    </div>
  );
}

export function PurchasePanel({ product }: { product: Product }) {
  const router = useRouter();
  const { add } = useCart();
  const colors = useMemo(() => [...new Set(product.variants.map((v) => v.color))], [product.variants]);
  const [color, setColor] = useState<string>(colors.length === 1 ? colors[0] : "");
  const [size, setSize] = useState("");
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState("");

  const sizesForColor = useMemo(() => {
    const list = product.variants.filter((v) => !color || v.color === color);
    const bySize = new Map<string, number>();
    for (const v of list) bySize.set(v.size, (bySize.get(v.size) ?? 0) + v.stock);
    return [...bySize.entries()].sort((a, b) => (parseFloat(a[0]) || 1e9) - (parseFloat(b[0]) || 1e9) || a[0].localeCompare(b[0]));
  }, [product.variants, color]);

  const variant = product.variants.find((v) => v.color === color && v.size === size);
  const maxQty = variant ? Math.min(variant.stock, MAX_QTY) : 0;
  const soldOut = product.totalStock <= 0;

  function validate(): boolean {
    if (!color) return setError("Please select a colour."), false;
    if (!size) return setError("Please select a size."), false;
    if (!variant || variant.stock <= 0) return setError("This size is out of stock."), false;
    if (qty < 1 || qty > maxQty) return setError(`Please choose a quantity between 1 and ${maxQty}.`), false;
    setError("");
    return true;
  }

  function addToCart(goToCart: boolean) {
    if (!validate() || !variant) return;
    add({ productId: product.id, sku: variant.sku, quantity: qty });
    if (goToCart) router.push("/cart");
    else setAdded(true);
  }

  return (
    <div className="space-y-5">
      {colors.length > 1 && (
        <fieldset>
          <legend className="mb-2 text-sm font-bold">
            Colour{color && <span className="ml-1 font-normal text-muted">{color}</span>}
          </legend>
          <div className="flex flex-wrap gap-2">
            {colors.map((c) => {
              const stock = product.variants.filter((v) => v.color === c).reduce((n, v) => n + v.stock, 0);
              return (
                <button key={c} type="button" aria-pressed={c === color} disabled={stock <= 0} onClick={() => { setColor(c); setSize(""); setQty(1); setAdded(false); setError(""); }} className={`min-h-10 rounded-[3px] border px-3 text-sm disabled:cursor-not-allowed disabled:text-muted disabled:line-through ${c === color ? "border-brand bg-brand-soft font-semibold" : "border-line bg-white"}`}>
                  {c}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      <fieldset>
        <legend className="mb-2 text-sm font-bold">
          Size{size && <span className="ml-1 font-normal text-muted">{size}</span>}
        </legend>
        <div className="flex flex-wrap gap-2">
          {sizesForColor.map(([s, stock]) => (
            <button key={s} type="button" aria-pressed={s === size} disabled={stock <= 0} aria-label={stock <= 0 ? `Size ${s}, out of stock` : `Size ${s}`} onClick={() => { setSize(s); setQty(1); setAdded(false); setError(""); }} className={`min-h-11 min-w-11 rounded-[3px] border px-3 text-sm disabled:cursor-not-allowed disabled:text-muted disabled:line-through ${s === size ? "border-brand bg-brand-soft font-semibold" : "border-line bg-white"}`}>
              {s}
            </button>
          ))}
        </div>
        {colors.length > 1 && !color && <p className="mt-1 text-xs text-muted">Choose a colour to see sizes in stock.</p>}
      </fieldset>

      {variant && (
        <p className={`text-sm font-semibold ${variant.stock <= 5 ? "text-warn" : "text-ok"}`} role="status">
          {variant.stock <= 0 ? "Out of stock" : variant.stock <= 5 ? `Only ${variant.stock} left` : "In stock"}
        </p>
      )}

      <div className="flex items-center gap-3">
        <label htmlFor="qty" className="text-sm font-bold">
          Quantity
        </label>
        <select id="qty" className="field w-24" value={qty} disabled={!variant || maxQty === 0} onChange={(e) => { setQty(Number(e.target.value)); setAdded(false); }}>
          {Array.from({ length: Math.max(1, maxQty) }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <p className="text-sm font-semibold text-danger" role="alert">
          {error}
        </p>
      )}

      {soldOut ? (
        <p className="card p-3 text-sm font-semibold text-danger">This product is currently out of stock.</p>
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row">
          <button type="button" className="btn btn-outline flex-1" onClick={() => addToCart(false)}>
            Add to cart
          </button>
          <button type="button" className="btn btn-cta flex-1" onClick={() => addToCart(true)}>
            Buy now
          </button>
        </div>
      )}
      {added && (
        <p className="flex items-center gap-2 text-sm text-ok" role="status">
          <Check size={16} aria-hidden /> Added to your cart.{" "}
          <Link href="/cart" className="font-semibold underline">
            View cart
          </Link>
        </p>
      )}
    </div>
  );
}

export { Price };

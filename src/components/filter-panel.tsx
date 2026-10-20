"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { SlidersHorizontal, X } from "lucide-react";
import type { Facets } from "@/lib/catalog-filter";

interface Props {
  facets: Facets;
  selected: { brands: string[]; sizes: string[]; colors: string[]; minPrice?: number; maxPrice?: number; inStock: boolean };
  hidden: Record<string, string>; // params preserved across filter changes (q, category, audience, sort)
  clearHref: string;
  activeCount: number;
}

function Group({ legend, name, options, checked }: { legend: string; name: string; options: string[]; checked: string[] }) {
  if (options.length === 0) return null;
  return (
    <fieldset className="border-b border-line py-3">
      <legend className="mb-2 text-sm font-bold">{legend}</legend>
      <div className={name === "size" ? "flex flex-wrap gap-2" : "max-h-48 space-y-1 overflow-y-auto"}>
        {options.map((o) =>
          name === "size" ? (
            <label key={o} className="cursor-pointer">
              <input type="checkbox" name={name} value={o} defaultChecked={checked.includes(o)} className="peer sr-only" />
              <span className="flex min-h-10 min-w-10 items-center justify-center rounded-[3px] border border-line px-2 text-sm peer-checked:border-brand peer-checked:bg-brand-soft peer-checked:font-semibold peer-focus-visible:outline-2 peer-focus-visible:outline-brand">{o}</span>
            </label>
          ) : (
            <label key={o} className="flex min-h-9 cursor-pointer items-center gap-2 text-sm">
              <input type="checkbox" name={name} value={o} defaultChecked={checked.includes(o)} className="size-4 accent-brand" />
              {o}
            </label>
          ),
        )}
      </div>
    </fieldset>
  );
}

export function FilterPanel({ facets, selected, hidden, clearHref, activeCount }: Props) {
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button type="button" className="btn btn-outline btn-sm lg:hidden" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-expanded={open}>
        <SlidersHorizontal size={16} aria-hidden />
        Filters{activeCount > 0 ? ` (${activeCount})` : ""}
      </button>
      {open && <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setOpen(false)} aria-hidden />}
      <aside
        aria-label="Filters"
        role={open ? "dialog" : undefined}
        aria-modal={open ? true : undefined}
        className={`${open ? "fixed inset-y-0 left-0 z-50 flex w-[88vw] max-w-sm flex-col bg-white" : "hidden"} lg:static lg:z-auto lg:block lg:w-64 lg:max-w-none lg:shrink-0 lg:self-start lg:rounded-[4px] lg:border lg:border-line lg:bg-white`}
      >
        <div className="flex items-center justify-between border-b border-line p-3 lg:hidden">
          <p className="font-bold">Filters</p>
          <button ref={closeRef} type="button" onClick={() => setOpen(false)} className="flex size-10 items-center justify-center" aria-label="Close filters">
            <X size={20} aria-hidden />
          </button>
        </div>
        <form action="/products" method="get" className="flex min-h-0 flex-1 flex-col lg:block">
          {Object.entries(hidden).map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))}
          <div className="min-h-0 flex-1 overflow-y-auto px-3 lg:overflow-visible">
            <div className="flex items-center justify-between pt-3 max-lg:hidden">
              <p className="font-bold">Filters</p>
              {activeCount > 0 && (
                <Link href={clearHref} className="text-sm font-semibold text-brand hover:underline">
                  Clear all
                </Link>
              )}
            </div>
            <fieldset className="border-b border-line py-3">
              <legend className="mb-2 text-sm font-bold">Price (₹)</legend>
              <div className="flex items-center gap-2">
                <label className="sr-only" htmlFor="minPrice">Minimum price</label>
                <input id="minPrice" name="minPrice" type="number" inputMode="numeric" min={0} placeholder={String(facets.minPrice)} defaultValue={selected.minPrice} className="field" />
                <span aria-hidden>to</span>
                <label className="sr-only" htmlFor="maxPrice">Maximum price</label>
                <input id="maxPrice" name="maxPrice" type="number" inputMode="numeric" min={0} placeholder={String(facets.maxPrice)} defaultValue={selected.maxPrice} className="field" />
              </div>
            </fieldset>
            <Group legend="Brand" name="brand" options={facets.brands} checked={selected.brands} />
            <Group legend="Size" name="size" options={facets.sizes} checked={selected.sizes} />
            <Group legend="Colour" name="color" options={facets.colors} checked={selected.colors} />
            <fieldset className="py-3">
              <legend className="mb-2 text-sm font-bold">Availability</legend>
              <label className="flex min-h-9 cursor-pointer items-center gap-2 text-sm">
                <input type="checkbox" name="instock" value="1" defaultChecked={selected.inStock} className="size-4 accent-brand" />
                In stock only
              </label>
            </fieldset>
          </div>
          <div className="flex gap-2 border-t border-line p-3">
            <button type="submit" className="btn btn-primary flex-1">
              Apply filters
            </button>
            {activeCount > 0 && (
              <Link href={clearHref} className="btn btn-outline lg:hidden">
                Clear all
              </Link>
            )}
          </div>
        </form>
      </aside>
    </>
  );
}

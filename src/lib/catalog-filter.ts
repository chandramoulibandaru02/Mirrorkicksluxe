import type { Product } from "./types";
import { discountPercent } from "./pricing";

export type SortKey = "newest" | "price_asc" | "price_desc" | "discount";
export const SORT_LABELS: Record<SortKey, string> = {
  newest: "Newest first",
  price_asc: "Price: low to high",
  price_desc: "Price: high to low",
  discount: "Discount",
};

export interface ListParams {
  q?: string;
  categoryId?: string;
  audience?: string;
  brands?: string[];
  sizes?: string[];
  colors?: string[];
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  featured?: boolean;
  sort?: SortKey;
  page?: number;
  pageSize?: number;
}

export interface Facets {
  brands: string[];
  sizes: string[];
  colors: string[];
  minPrice: number;
  maxPrice: number;
}

const norm = (s: string) => s.toLowerCase().trim();

export function matchesQuery(p: Product, q: string, categoryName = ""): boolean {
  const tokens = norm(q).split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;
  const hay = norm(
    [p.name, p.brand, p.sku, p.audience, categoryName, ...p.variants.map((v) => `${v.sku} ${v.color}`), ...p.attributes.map((a) => `${a.key} ${a.value}`)].join(" "),
  );
  return tokens.every((t) => hay.includes(t));
}

function sizeNum(s: string) {
  const n = parseFloat(s);
  return Number.isNaN(n) ? Infinity : n;
}

export function computeFacets(products: Product[]): Facets {
  const brands = new Set<string>();
  const sizes = new Set<string>();
  const colors = new Set<string>();
  let min = Infinity;
  let max = 0;
  for (const p of products) {
    brands.add(p.brand);
    p.variants.forEach((v) => {
      sizes.add(v.size);
      colors.add(v.color);
    });
    min = Math.min(min, p.price);
    max = Math.max(max, p.price);
  }
  return {
    brands: [...brands].sort((a, b) => a.localeCompare(b)),
    sizes: [...sizes].sort((a, b) => sizeNum(a) - sizeNum(b) || a.localeCompare(b)),
    colors: [...colors].sort((a, b) => a.localeCompare(b)),
    minPrice: min === Infinity ? 0 : min,
    maxPrice: max,
  };
}

/** Narrowing that defines the facet universe: everything except the facet filters themselves. */
export function baseFilter(products: Product[], p: ListParams, categoryName = ""): Product[] {
  return products.filter(
    (x) =>
      (!p.categoryId || x.categoryId === p.categoryId) &&
      (!p.audience || x.audience === p.audience) &&
      (!p.featured || x.featured) &&
      (!p.q || matchesQuery(x, p.q, categoryName)),
  );
}

export function applyFacetFilters(products: Product[], p: ListParams): Product[] {
  const brands = (p.brands ?? []).map(norm);
  const sizes = (p.sizes ?? []).map(norm);
  const colors = (p.colors ?? []).map(norm);
  return products.filter((x) => {
    if (brands.length && !brands.includes(norm(x.brand))) return false;
    if (p.minPrice !== undefined && x.price < p.minPrice) return false;
    if (p.maxPrice !== undefined && x.price > p.maxPrice) return false;
    // size/colour/availability must be satisfied by the SAME variant that has stock when "in stock" is on.
    const vs = x.variants.filter(
      (v) => (!sizes.length || sizes.includes(norm(v.size))) && (!colors.length || colors.includes(norm(v.color))) && (!p.inStock || v.stock > 0),
    );
    if ((sizes.length || colors.length || p.inStock) && vs.length === 0) return false;
    return true;
  });
}

export function sortProducts(products: Product[], sort: SortKey = "newest"): Product[] {
  const arr = [...products];
  switch (sort) {
    case "price_asc":
      return arr.sort((a, b) => a.price - b.price);
    case "price_desc":
      return arr.sort((a, b) => b.price - a.price);
    case "discount":
      return arr
        .filter((p) => discountPercent(p.price, p.originalPrice) > 0)
        .sort((a, b) => discountPercent(b.price, b.originalPrice) - discountPercent(a.price, a.originalPrice));
    default:
      return arr.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}

export function paginate<T>(items: T[], page = 1, pageSize = 24) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const current = Math.min(Math.max(1, page), totalPages);
  return { items: items.slice((current - 1) * pageSize, current * pageSize), page: current, totalPages, total: items.length };
}

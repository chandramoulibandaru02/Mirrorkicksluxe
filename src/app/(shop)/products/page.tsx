import type { Metadata } from "next";
import Link from "next/link";
import { AUDIENCES, AUDIENCE_LABEL } from "@/lib/brand";
import { loadCatalog } from "@/lib/server/catalog";
import { applyFacetFilters, baseFilter, computeFacets, paginate, SORT_LABELS, sortProducts, type SortKey } from "@/lib/catalog-filter";
import { EmptyState, ProductGrid } from "@/components/product-ui";
import { FilterPanel } from "@/components/filter-panel";

type SP = Record<string, string | string[] | undefined>;
const arr = (v: string | string[] | undefined) => (Array.isArray(v) ? v : v ? [v] : []);
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const num = (v: string | string[] | undefined) => {
  const n = Number(one(v));
  return one(v) && Number.isFinite(n) && n >= 0 ? n : undefined;
};

export async function generateMetadata({ searchParams }: { searchParams: Promise<SP> }): Promise<Metadata> {
  const sp = await searchParams;
  const q = one(sp.q);
  return {
    title: q ? `Search results for "${q.slice(0, 60)}"` : "All footwear",
    description: "Browse footwear by category, brand, size, colour and price.",
    // Search/filter result pages are not useful to index; the unfiltered listing is.
    alternates: { canonical: "/products" },
    robots: q || Object.keys(sp).length ? { index: false, follow: true } : undefined,
  };
}

export default async function ProductsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { products, categories, error } = await loadCatalog();
  if (error) {
    return (
      <div className="container-x py-8">
        <EmptyState title="The catalogue is temporarily unavailable">Please try again in a few minutes.</EmptyState>
      </div>
    );
  }

  const categorySlug = one(sp.category);
  const category = categories.find((c) => c.slug === categorySlug);
  const audienceRaw = one(sp.audience);
  const audience = AUDIENCES.find((a) => a === audienceRaw);
  const q = one(sp.q)?.slice(0, 100).trim() || undefined;
  const sort = (Object.keys(SORT_LABELS).includes(one(sp.sort) ?? "") ? one(sp.sort) : "newest") as SortKey;

  const params = {
    q,
    categoryId: category?.id ?? (categorySlug ? "__none__" : undefined),
    audience,
    featured: one(sp.featured) === "1",
    brands: arr(sp.brand),
    sizes: arr(sp.size),
    colors: arr(sp.color),
    minPrice: num(sp.minPrice),
    maxPrice: num(sp.maxPrice),
    inStock: one(sp.instock) === "1",
  };

  const universe = baseFilter(products, params, category?.name);
  const facets = computeFacets(universe);
  const filtered = sortProducts(applyFacetFilters(universe, params), sort);
  const page = paginate(filtered, Number(one(sp.page)) || 1, 24);

  const activeCount = params.brands.length + params.sizes.length + params.colors.length + (params.minPrice !== undefined ? 1 : 0) + (params.maxPrice !== undefined ? 1 : 0) + (params.inStock ? 1 : 0);

  const keep = new URLSearchParams();
  if (q) keep.set("q", q);
  if (categorySlug) keep.set("category", categorySlug);
  if (audience) keep.set("audience", audience);
  if (params.featured) keep.set("featured", "1");
  const hidden = Object.fromEntries(keep.entries());
  if (sort !== "newest") hidden.sort = sort;
  const clearHref = `/products${keep.toString() ? `?${keep}` : ""}`;

  const pageHref = (n: number) => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) for (const x of arr(v)) if (k !== "page") u.append(k, x);
    if (n > 1) u.set("page", String(n));
    return `/products${u.toString() ? `?${u}` : ""}`;
  };
  const sortHref = (s: string) => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) for (const x of arr(v)) if (k !== "page" && k !== "sort") u.append(k, x);
    u.set("sort", s);
    return `/products?${u}`;
  };

  const heading = q ? `Results for "${q}"` : category ? category.name : audience ? `${AUDIENCE_LABEL[audience]}'s footwear` : params.featured ? "Featured footwear" : "All footwear";

  return (
    <div className="container-x py-4 sm:py-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{heading}</h1>
          <p className="text-sm text-muted" aria-live="polite">
            {page.total} {page.total === 1 ? "product" : "products"}
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-4 lg:flex-row">
        {/* Desktop: sidebar. Mobile: a button that opens a drawer. */}
        <FilterPanel facets={facets} selected={{ brands: params.brands, sizes: params.sizes, colors: params.colors, minPrice: params.minPrice, maxPrice: params.maxPrice, inStock: params.inStock }} hidden={hidden} clearHref={clearHref} activeCount={activeCount} />
        <div className="min-w-0 flex-1">
          <nav aria-label="Sort" className="mb-3 flex items-center gap-2 overflow-x-auto text-sm whitespace-nowrap">
            <span className="font-semibold">Sort by</span>
            {(Object.keys(SORT_LABELS) as SortKey[]).map((s) => (
              <Link key={s} href={sortHref(s)} aria-current={s === sort ? "true" : undefined} className={`rounded-[3px] border px-2.5 py-1.5 ${s === sort ? "border-brand bg-brand-soft font-semibold text-brand" : "border-line bg-white"}`}>
                {SORT_LABELS[s]}
              </Link>
            ))}
          </nav>
          {page.items.length === 0 ? (
            <EmptyState title="No products match your search">
              {activeCount > 0 ? (
                <Link href={clearHref} className="font-semibold text-brand underline">
                  Clear all filters
                </Link>
              ) : (
                "Try a different search term or browse all footwear."
              )}
            </EmptyState>
          ) : (
            <ProductGrid products={page.items} />
          )}
          {page.totalPages > 1 && (
            <nav aria-label="Pagination" className="mt-6 flex items-center justify-center gap-3 text-sm">
              {page.page > 1 ? (
                <Link href={pageHref(page.page - 1)} className="btn btn-outline btn-sm" rel="prev">
                  Previous
                </Link>
              ) : (
                <span className="btn btn-outline btn-sm" aria-disabled="true">Previous</span>
              )}
              <span>
                Page {page.page} of {page.totalPages}
              </span>
              {page.page < page.totalPages ? (
                <Link href={pageHref(page.page + 1)} className="btn btn-outline btn-sm" rel="next">
                  Next
                </Link>
              ) : (
                <span className="btn btn-outline btn-sm" aria-disabled="true">Next</span>
              )}
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}

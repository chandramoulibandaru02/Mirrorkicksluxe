import Link from "next/link";
import { Search } from "lucide-react";
import { SITE_NAME, AUDIENCES, AUDIENCE_LABEL } from "@/lib/brand";
import { loadCatalog } from "@/lib/server/catalog";
import { AccountLink, CartLink } from "./header-links";

export async function Header() {
  const { categories, products } = await loadCatalog();
  const audiencesInUse = AUDIENCES.filter((a) => products.some((p) => p.audience === a));
  const categoriesInUse = categories.filter((c) => products.some((p) => p.categoryId === c.id));

  return (
    <header className="sticky top-0 z-40 bg-brand text-white">
      <div className="container-x flex flex-wrap items-center gap-x-4 gap-y-2 py-2.5 sm:flex-nowrap">
        <Link href="/" className="shrink-0 text-xl font-bold tracking-tight" aria-label={`${SITE_NAME} home`}>
          {SITE_NAME}
        </Link>
        <form action="/products" role="search" className="order-last flex w-full min-w-0 sm:order-none sm:flex-1" aria-label="Search products">
          <label htmlFor="site-search" className="sr-only">
            Search by product, brand or SKU
          </label>
          <input
            id="site-search"
            name="q"
            type="search"
            placeholder="Search by product, brand or SKU"
            className="min-h-11 w-full min-w-0 rounded-l-[3px] bg-white px-3 text-base text-ink placeholder:text-muted"
            autoComplete="off"
          />
          <button type="submit" className="flex min-h-11 w-12 shrink-0 items-center justify-center rounded-r-[3px] bg-cta hover:bg-cta-dark" aria-label="Search">
            <Search size={20} aria-hidden />
          </button>
        </form>
        <nav className="ml-auto flex items-center gap-1 sm:ml-0" aria-label="Account and cart">
          <AccountLink />
          <CartLink />
        </nav>
      </div>
      {(audiencesInUse.length > 0 || categoriesInUse.length > 0) && (
        <nav className="border-t border-white/15 bg-brand-dark" aria-label="Shop by category">
          <ul className="container-x flex gap-5 overflow-x-auto py-2 text-sm whitespace-nowrap">
            <li>
              <Link href="/products" className="font-semibold hover:underline">
                All footwear
              </Link>
            </li>
            {audiencesInUse.map((a) => (
              <li key={a}>
                <Link href={`/products?audience=${a}`} className="hover:underline">
                  {AUDIENCE_LABEL[a]}
                </Link>
              </li>
            ))}
            {categoriesInUse.map((c) => (
              <li key={c.id}>
                <Link href={`/products?category=${c.slug}`} className="text-white/85 hover:underline">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}

import Link from "next/link";
import { Banknote, Truck } from "lucide-react";
import { AUDIENCES, AUDIENCE_LABEL } from "@/lib/brand";
import { discountPercent, formatINR } from "@/lib/pricing";
import { loadCatalog } from "@/lib/server/catalog";
import { getSettings } from "@/lib/server/settings";
import { EmptyState, ProductGrid, ProductImage } from "@/components/product-ui";
import type { Product } from "@/lib/types";

export default async function HomePage() {
  const [{ products, categories, error }, settings] = await Promise.all([loadCatalog(), getSettings()]);

  if (error) {
    return (
      <div className="container-x py-10">
        <EmptyState title="The catalogue is temporarily unavailable">Please try again in a few minutes.</EmptyState>
      </div>
    );
  }
  if (products.length === 0) {
    return (
      <div className="container-x py-10">
        <EmptyState title="Our catalogue is being set up">
          No products are published yet. Please check back soon, or <Link href="/contact" className="text-brand underline">contact us</Link>.
        </EmptyState>
      </div>
    );
  }

  const newest = [...products].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const featured = newest.filter((p) => p.featured).slice(0, 8);
  const offers = products
    .filter((p) => discountPercent(p.price, p.originalPrice) > 0)
    .sort((a, b) => discountPercent(b.price, b.originalPrice) - discountPercent(a.price, a.originalPrice))
    .slice(0, 8);
  const maxOff = offers[0] ? discountPercent(offers[0].price, offers[0].originalPrice) : 0;
  const minPrice = Math.min(...products.map((p) => p.price));
  const audiences = AUDIENCES.filter((a) => products.some((p) => p.audience === a));
  const cats = categories
    .map((c) => ({ c, items: products.filter((p) => p.categoryId === c.id) }))
    .filter((x) => x.items.length > 0);

  const infoStrip = [
    settings.freeShippingThreshold > 0 && { icon: Truck, text: `Free delivery on orders above ${formatINR(settings.freeShippingThreshold)}` },
    settings.codEnabled && { icon: Banknote, text: "Cash on delivery available" },
  ].filter(Boolean) as { icon: typeof Truck; text: string }[];

  return (
    <div className="container-x space-y-8 py-4 sm:py-6">
      <section aria-labelledby="shop-heading" className="card p-4 sm:p-6">
        <h1 id="shop-heading" className="text-xl font-bold sm:text-2xl">
          Shop footwear online
        </h1>
        <p className="mt-1 text-sm text-muted">
          {products.length} {products.length === 1 ? "style" : "styles"} from {new Set(products.map((p) => p.brand)).size} {new Set(products.map((p) => p.brand)).size === 1 ? "brand" : "brands"}, starting at {formatINR(minPrice)}
          {maxOff > 0 && <>. Up to {maxOff}% off on selected styles</>}.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {audiences.map((a) => (
            <Link key={a} href={`/products?audience=${a}`} className="btn btn-outline">
              {AUDIENCE_LABEL[a]}
            </Link>
          ))}
          <Link href="/products" className="btn btn-primary">
            Browse all footwear
          </Link>
        </div>
        {infoStrip.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-1 border-t border-line pt-3 text-sm">
            {infoStrip.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-2">
                <Icon size={18} className="text-brand" aria-hidden />
                {text}
              </li>
            ))}
          </ul>
        )}
      </section>

      {cats.length > 0 && (
        <section aria-labelledby="cat-heading">
          <h2 id="cat-heading" className="mb-3 text-lg font-bold">
            Shop by category
          </h2>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {cats.map(({ c, items }) => {
              const img = items[0]?.images.find((i) => i.isPrimary) ?? items[0]?.images[0];
              return (
                <li key={c.id}>
                  <Link href={`/products?category=${c.slug}`} className="card block overflow-hidden hover:border-brand">
                    <div className="relative aspect-[4/3] bg-white p-2">
                      <ProductImage src={img?.url} alt="" sizes="(min-width:1024px) 15vw, 45vw" />
                    </div>
                    <div className="border-t border-line p-2.5 text-center">
                      <p className="text-sm font-semibold">{c.name}</p>
                      <p className="text-xs text-muted">{items.length} {items.length === 1 ? "style" : "styles"}</p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <Section title="Featured" href="/products?featured=1" products={featured} />
      <Section title="Offers" href="/products?sort=discount" products={offers} />
      <Section title="New arrivals" href="/products?sort=newest" products={newest.slice(0, 8)} />
    </div>
  );
}

function Section({ title, href, products }: { title: string; href: string; products: Product[] }) {
  if (products.length === 0) return null;
  return (
    <section aria-label={title}>
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-lg font-bold">{title}</h2>
        <Link href={href} className="text-sm font-semibold text-brand hover:underline">
          View all
        </Link>
      </div>
      <ProductGrid products={products} />
    </section>
  );
}

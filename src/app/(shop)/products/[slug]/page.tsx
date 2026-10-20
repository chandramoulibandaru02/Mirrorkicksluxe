import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SITE_URL, AUDIENCE_LABEL } from "@/lib/brand";
import { getProductBySlug, loadCatalog, relatedProducts } from "@/lib/server/catalog";
import { cldUrl } from "@/lib/pricing";
import { ProductGrid, Price } from "@/components/product-ui";
import { Gallery, PurchasePanel } from "@/components/product-detail-client";
import { getSettings } from "@/lib/server/settings";

type Props = { params: Promise<{ slug: string }> };

async function load(slug: string) {
  try {
    return await getProductBySlug(slug);
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await load(slug);
  if (!p) return { title: "Product not found", robots: { index: false } };
  const img = p.images.find((i) => i.isPrimary) ?? p.images[0];
  const desc = (p.description || `${p.brand} ${p.name}. Available in ${p.sizes.length} size${p.sizes.length === 1 ? "" : "s"}.`).replace(/\s+/g, " ").slice(0, 160);
  return {
    title: `${p.brand} ${p.name}`,
    description: desc,
    alternates: { canonical: `/products/${p.slug}` },
    openGraph: { title: `${p.brand} ${p.name}`, description: desc, type: "website", images: img ? [{ url: cldUrl(img.url, 1200) }] : undefined },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await load(slug);
  if (!product) notFound();

  const [{ products, categories }, settings] = await Promise.all([loadCatalog(), getSettings()]);
  const category = categories.find((c) => c.id === product.categoryId);
  const related = relatedProducts(products, product);
  const inStock = product.totalStock > 0;

  // Structured data uses only stored facts: no ratings or reviews are ever emitted.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    sku: product.sku,
    brand: { "@type": "Brand", name: product.brand },
    description: product.description || undefined,
    image: product.images.map((i) => cldUrl(i.url, 1200)),
    category: category?.name,
    offers: {
      "@type": "Offer",
      priceCurrency: "INR",
      price: product.price,
      availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: `${SITE_URL}/products/${product.slug}`,
    },
  };

  return (
    <div className="container-x py-4 sm:py-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <nav aria-label="Breadcrumb" className="mb-3 text-sm text-muted">
        <ol className="flex flex-wrap gap-1.5">
          <li>
            <Link href="/" className="hover:underline">Home</Link>
          </li>
          <li aria-hidden>/</li>
          {category && (
            <>
              <li>
                <Link href={`/products?category=${category.slug}`} className="hover:underline">{category.name}</Link>
              </li>
              <li aria-hidden>/</li>
            </>
          )}
          <li aria-current="page" className="text-ink">{product.name}</li>
        </ol>
      </nav>

      <div className="card grid gap-6 p-3 sm:p-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <Gallery product={product} />
        <div className="space-y-4">
          <div>
            <p className="text-sm font-semibold tracking-wide text-muted uppercase">{product.brand}</p>
            <h1 className="text-xl font-bold sm:text-2xl">{product.name}</h1>
            <p className="mt-1 text-xs text-muted">SKU: {product.sku}</p>
          </div>
          <div>
            <Price price={product.price} originalPrice={product.originalPrice} size="lg" />
          </div>
          <PurchasePanel product={product} />
          <ul className="space-y-1 border-t border-line pt-3 text-sm">
            {settings.codEnabled && <li>Cash on delivery available</li>}
            {settings.freeShippingThreshold > 0 && <li>Free delivery on orders above ₹{settings.freeShippingThreshold.toLocaleString("en-IN")}</li>}
          </ul>
        </div>
      </div>

      <section className="card mt-4 p-4 sm:p-5" aria-labelledby="details">
        <h2 id="details" className="mb-3 text-lg font-bold">Product details</h2>
        {product.description && <p className="mb-4 max-w-3xl text-sm leading-relaxed whitespace-pre-line">{product.description}</p>}
        <dl className="grid max-w-xl grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 text-sm">
          <dt className="text-muted">Brand</dt>
          <dd>{product.brand}</dd>
          {category && (<><dt className="text-muted">Category</dt><dd>{category.name}</dd></>)}
          <dt className="text-muted">For</dt>
          <dd>{AUDIENCE_LABEL[product.audience]}</dd>
          {product.attributes.map((a) => (
            <div key={a.key} className="contents">
              <dt className="text-muted">{a.key}</dt>
              <dd>{a.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {related.length > 0 && (
        <section className="mt-6" aria-labelledby="related">
          <h2 id="related" className="mb-3 text-lg font-bold">Similar footwear</h2>
          <ProductGrid products={related.slice(0, 4)} />
        </section>
      )}
    </div>
  );
}

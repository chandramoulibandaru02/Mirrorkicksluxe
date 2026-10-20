import Image from "next/image";
import Link from "next/link";
import { ImageOff } from "lucide-react";
import { cldUrl, discountPercent, formatINR } from "@/lib/pricing";
import type { Product } from "@/lib/types";

const loader = ({ src, width }: { src: string; width: number }) => cldUrl(src, width);
export function ProductImage({ src, alt, sizes, priority = false, className = "object-contain" }: { src: string | null | undefined; alt: string; sizes: string; priority?: boolean; className?: string }) {
  if (!src) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-page text-muted" role="img" aria-label="No image available">
        <ImageOff size={32} aria-hidden />
      </div>
    );
  }
  return <Image    src={src} alt={alt} fill sizes={sizes} priority={priority} className={className} />;
}

export function Price({ price, originalPrice, size = "md" }: { price: number; originalPrice: number | null | undefined; size?: "md" | "lg" }) {
  const pct = discountPercent(price, originalPrice);
  return (
    <p className="flex flex-wrap items-baseline gap-x-2">
      <span className={size === "lg" ? "text-2xl font-bold" : "text-base font-bold"}>{formatINR(price)}</span>
      {pct > 0 && originalPrice && (
        <>
          <s className="text-sm text-muted" aria-label={`Original price ${formatINR(originalPrice)}`}>
            {formatINR(originalPrice)}
          </s>
          <span className="text-sm font-semibold text-ok">{pct}% off</span>
        </>
      )}
    </p>
  );
}

export function ProductCard({ product, priority = false }: { product: Product; priority?: boolean }) {
  const img = product.images.find((i) => i.isPrimary) ?? product.images[0];
  const out = product.totalStock <= 0;
  return (
    <article className="card group relative flex w-full flex-col overflow-hidden hover:border-brand">
      <Link href={`/products/${product.slug}`} className="flex flex-1 flex-col" aria-label={`${product.brand} ${product.name}`}>
        <div className="relative aspect-square bg-white p-2">
          <ProductImage src={img?.url} alt={img?.alt || `${product.brand} ${product.name}`} sizes="(min-width:1024px) 20vw, (min-width:640px) 33vw, 50vw" priority={priority} />
        </div>
        <div className="flex flex-1 flex-col gap-1 border-t border-line p-3">
          <p className="text-xs font-semibold tracking-wide text-muted uppercase">{product.brand}</p>
          <h3 className="line-clamp-2 text-sm leading-snug">{product.name}</h3>
          <div className="mt-auto pt-1">
            <Price price={product.price} originalPrice={product.originalPrice} />
            {out && <p className="mt-1 text-xs font-semibold text-danger">Out of stock</p>}
          </div>
        </div>
      </Link>
    </article>
  );
}

export function ProductGrid({ products }: { products: Product[] }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((p, i) => (
        <li key={p.id} className="flex">
          <div className="flex w-full">
            <ProductCard product={p} priority={i < 4} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="card px-4 py-10 text-center">
      <p className="text-lg font-semibold">{title}</p>
      {children && <div className="mt-2 text-sm text-muted">{children}</div>}
    </div>
  );
}

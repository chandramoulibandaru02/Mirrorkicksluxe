
import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/brand";
import { loadCatalog } from "@/lib/server/catalog";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { products, categories } = await loadCatalog();

  // Normalize the production URL.
  const baseUrl = SITE_URL.replace(/\/+$/, "");
  const now = new Date();

  const urls: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${baseUrl}/products`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/contact`,
      changeFrequency: "yearly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/privacy-policy`,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms-and-conditions`,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  // Include categories that have products.
  // These are filter URLs, so include them only if
  // you want Google to index those category views.
  const activeCategories = categories.filter((category) =>
    products.some((product) => product.categoryId === category.id)
  );

  for (const category of activeCategories) {
    urls.push({
      url: `${baseUrl}/products?category=${encodeURIComponent(category.slug)}`,
      changeFrequency: "weekly",
      priority: 0.7,
    });
  }

  // Include product pages.
  for (const product of products) {
    urls.push({
      url: `${baseUrl}/products/${encodeURIComponent(product.slug)}`,
      lastModified: product.updatedAt
        ? validDate(product.updatedAt) ?? now
        : now,
      changeFrequency: "weekly",
      priority: 0.8,
    });
  }

  // Remove duplicate URLs.
  const uniqueUrls = new Map(
    urls.map((entry) => [entry.url, entry])
  );

  return [...uniqueUrls.values()];
}

function validDate(value: string | number | Date): Date | undefined {
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? undefined : date;
}

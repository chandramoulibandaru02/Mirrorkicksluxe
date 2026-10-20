import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/brand";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/account", "/cart", "/checkout", "/orders", "/login", "/signup", "/forgot-password"] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}

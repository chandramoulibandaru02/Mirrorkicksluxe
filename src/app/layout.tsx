import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SITE_NAME, SITE_URL } from "@/lib/brand";
import { AuthProvider } from "@/components/auth-provider";

// Pages read live data (cached per-query with tags), so they must not be frozen at build time.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${SITE_NAME} - Footwear for men, women and kids`, template: `%s | ${SITE_NAME}` },
  description: `Shop footwear online at ${SITE_NAME}. Browse by category, brand, size and colour.`,
  applicationName: SITE_NAME,
  openGraph: { siteName: SITE_NAME, type: "website", locale: "en_IN" },
};

export const viewport: Viewport = { themeColor: "#0f4c81", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}

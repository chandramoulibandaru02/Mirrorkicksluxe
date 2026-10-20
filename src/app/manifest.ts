import type { MetadataRoute } from "next";
import { SITE_NAME } from "@/lib/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: SITE_NAME,
    description: "Footwear for men, women and kids.",
    start_url: "/",
    display: "browser",
    background_color: "#f1f3f6",
    theme_color: "#0f4c81",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}

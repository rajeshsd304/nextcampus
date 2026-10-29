import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/env";
import { PUBLIC_ROUTES } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  return PUBLIC_ROUTES.map((route) => ({
    url: `${siteUrl}${route === "/" ? "" : route}`,
    changeFrequency: route.startsWith("/legal") ? "yearly" : "monthly",
    priority: route === "/" ? 1 : route.startsWith("/legal") ? 0.3 : 0.7,
  }));
}

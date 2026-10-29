import type { MetadataRoute } from "next";
import { loadPublicCatalog } from "@/features/catalog/server/queries";
import { getSiteUrl } from "@/lib/env";
import { PUBLIC_ROUTES } from "@/lib/site";

// Read the catalog on every request so universities added or deactivated by a
// platform admin are reflected without a rebuild.
export const dynamic = "force-dynamic";

/** Static pages plus one entry per active university, read from the database. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const staticEntries: MetadataRoute.Sitemap = PUBLIC_ROUTES.map((route) => ({
    url: `${siteUrl}${route === "/" ? "" : route}`,
    changeFrequency: route.startsWith("/legal") ? "yearly" : "weekly",
    priority: route === "/" ? 1 : route === "/exams" ? 0.9 : route.startsWith("/legal") ? 0.3 : 0.7,
  }));

  const catalog = await loadPublicCatalog();
  const universityEntries: MetadataRoute.Sitemap = catalog.ok
    ? catalog.catalog.universities.map((u) => ({
        url: `${siteUrl}/exams/${u.slug}`,
        changeFrequency: "weekly",
        priority: 0.8,
      }))
    : [];

  return [...staticEntries, ...universityEntries];
}

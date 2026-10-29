import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/dashboard",
          "/o/",
          "/settings",
          "/notifications",
          "/onboarding",
          "/invitations",
          "/invite/",
          "/platform",
          "/auth/",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}

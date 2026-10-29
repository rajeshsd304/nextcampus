import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Skip static assets, image optimisation, metadata files and public assets.
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|robots.txt|sitemap.xml|opengraph-image|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};

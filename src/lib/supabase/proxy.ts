import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getPublicEnv } from "@/lib/env";
import type { Database } from "@/types/database";

export const PROTECTED_PREFIXES = [
  "/dashboard",
  "/o/",
  "/settings",
  "/notifications",
  "/onboarding",
  "/invitations",
  "/platform",
  "/reset-password",
] as const;

const GUEST_ONLY_PATHS = ["/sign-in", "/sign-up", "/forgot-password"] as const;

export const LAST_ORG_COOKIE = "nc_last_org";

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((prefix) =>
    prefix.endsWith("/")
      ? pathname.startsWith(prefix)
      : pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * Refreshes the Supabase session cookie on every request and performs coarse,
 * optimistic routing. Real authorization happens in server components, server
 * actions and RLS — never only here.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  const env = getPublicEnv();
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(env.supabaseUrl, env.supabasePublishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
        for (const [key, value] of Object.entries(headers ?? {})) response.headers.set(key, value);
      },
    },
  });

  // Do not run code between createServerClient and getClaims().
  const { data } = await supabase.auth.getClaims();
  const isSignedIn = Boolean(data?.claims?.sub);
  const { pathname, search } = request.nextUrl;

  if (!isSignedIn && isProtectedPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    url.search = "";
    url.searchParams.set("next", `${pathname}${search}`);
    return withCookies(NextResponse.redirect(url), response);
  }

  if (isSignedIn && (GUEST_ONLY_PATHS as readonly string[]).includes(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return withCookies(NextResponse.redirect(url), response);
  }

  // Remember the last visited workspace as a preference (validated on use).
  const orgMatch = /^\/o\/([a-z0-9-]{3,48})(?:\/|$)/.exec(pathname);
  if (isSignedIn && orgMatch?.[1]) {
    response.cookies.set(LAST_ORG_COOKIE, orgMatch[1], {
      httpOnly: true,
      sameSite: "lax",
      secure: request.nextUrl.protocol === "https:",
      path: "/",
      maxAge: 60 * 60 * 24 * 180,
    });
  }

  return response;
}

function withCookies(target: NextResponse, source: NextResponse): NextResponse {
  for (const cookie of source.cookies.getAll()) target.cookies.set(cookie);
  return target;
}

import { NextResponse, type NextRequest } from "next/server";
import { logAuthEvent } from "@/features/auth/server/audit";
import { syncPreferencesAfterSignIn } from "@/features/preferences/server";
import { getPublicEnv } from "@/lib/env";
import { safeRedirectPath } from "@/lib/redirect";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** OAuth (PKCE) callback: exchanges the authorization code for a session. */
export async function GET(request: NextRequest) {
  const { siteUrl } = getPublicEnv();
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeRedirectPath(searchParams.get("next"));

  if (searchParams.get("error") || !code) {
    return NextResponse.redirect(new URL("/sign-in?error=oauth_failed", siteUrl));
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) {
    return NextResponse.redirect(new URL("/sign-in?error=oauth_failed", siteUrl));
  }

  const provider = data.user.app_metadata.provider;
  await logAuthEvent(supabase, "auth.sign_in", provider === "google" ? "google" : "email_link");
  await syncPreferencesAfterSignIn(supabase, data.user.id);
  return NextResponse.redirect(new URL(next, siteUrl));
}

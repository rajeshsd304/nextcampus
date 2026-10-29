import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { logAuthEvent } from "@/features/auth/server/audit";
import { syncPreferencesAfterSignIn } from "@/features/preferences/server";
import { getPublicEnv } from "@/lib/env";
import { safeRedirectPath } from "@/lib/redirect";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const OTP_TYPES: readonly EmailOtpType[] = [
  "signup",
  "email",
  "recovery",
  "invite",
  "magiclink",
  "email_change",
];

function isOtpType(value: string | null): value is EmailOtpType {
  return value !== null && (OTP_TYPES as readonly string[]).includes(value);
}

/** Email link verification (sign-up confirmation, password recovery, email change). */
export async function GET(request: NextRequest) {
  const { siteUrl } = getPublicEnv();
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");

  if (!tokenHash || !isOtpType(type)) {
    return NextResponse.redirect(new URL("/sign-in?error=link_invalid", siteUrl));
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
  if (error) {
    return NextResponse.redirect(new URL("/sign-in?error=link_expired", siteUrl));
  }

  if (data.user) await syncPreferencesAfterSignIn(supabase, data.user.id);

  if (type === "recovery") {
    await logAuthEvent(supabase, "auth.sign_in", "recovery");
    return NextResponse.redirect(new URL("/reset-password", siteUrl));
  }

  await logAuthEvent(supabase, "auth.email_verified", "email_link");
  const next = safeRedirectPath(searchParams.get("next"), { origin: siteUrl, fallback: "/onboarding" });
  return NextResponse.redirect(new URL(next, siteUrl));
}

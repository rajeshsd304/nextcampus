import "server-only";
import { cookies } from "next/headers";
import { getLocale } from "next-intl/server";
import { cache } from "react";
import {
  DEFAULT_NUMERALS,
  isLocale,
  isNumeralSystem,
  LOCALE_COOKIE,
  NUMERALS_COOKIE,
  PREFERENCE_COOKIE_MAX_AGE,
  type Locale,
  type NumeralSystem,
} from "@/i18n/config";
import { formatContext, type FormatContext } from "@/lib/i18n-format";
import type { SupabaseServerClient } from "@/lib/supabase/server";

const cookieOptions = {
  path: "/",
  sameSite: "lax" as const,
  maxAge: PREFERENCE_COOKIE_MAX_AGE,
  secure: process.env.NODE_ENV === "production",
};

export async function getNumeralPreference(locale: Locale): Promise<NumeralSystem> {
  const value = (await cookies()).get(NUMERALS_COOKIE)?.value;
  return isNumeralSystem(value) ? value : DEFAULT_NUMERALS[locale];
}

/** Formatting context for the current request (locale, digits, viewer time zone). */
export const getFormatContext = cache(async (timeZone?: string | null): Promise<FormatContext> => {
  const locale = await getLocale();
  return formatContext(locale, { numerals: await getNumeralPreference(locale), timeZone });
});

/** Writes preference cookies. Only callable from Server Actions / Route Handlers. */
export async function writePreferenceCookies(prefs: {
  locale?: Locale | null;
  numerals?: NumeralSystem | null;
}): Promise<void> {
  const store = await cookies();
  if (prefs.locale) store.set(LOCALE_COOKIE, prefs.locale, cookieOptions);
  if (prefs.numerals) store.set(NUMERALS_COOKIE, prefs.numerals, cookieOptions);
  else if (prefs.numerals === null) store.delete(NUMERALS_COOKIE);
}

/**
 * After sign-in: the profile is the source of truth for a returning user's
 * preferences; copy it into cookies. A first-time user's current cookie
 * choice is saved to the profile instead.
 */
export async function syncPreferencesAfterSignIn(
  supabase: SupabaseServerClient,
  userId: string,
): Promise<void> {
  const { data } = await supabase
    .from("profiles")
    .select("preferred_locale, preferred_numerals")
    .eq("id", userId)
    .maybeSingle();
  if (!data) return;

  if (isLocale(data.preferred_locale)) {
    await writePreferenceCookies({
      locale: data.preferred_locale,
      numerals: isNumeralSystem(data.preferred_numerals) ? data.preferred_numerals : undefined,
    });
    return;
  }

  const cookieLocale = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(cookieLocale)) {
    await supabase.from("profiles").update({ preferred_locale: cookieLocale }).eq("id", userId);
  }
}

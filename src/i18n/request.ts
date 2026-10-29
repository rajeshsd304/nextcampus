import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE } from "./config";
import { loadMessages } from "./messages";

/**
 * Cookie-based locale resolution (no locale prefix in URLs, so every existing
 * route keeps working). Signed-in users' profile preference is copied into the
 * cookie at sign-in and whenever it changes.
 */
export default getRequestConfig(async () => {
  const cookieLocale = (await cookies()).get(LOCALE_COOKIE)?.value;
  const locale = isLocale(cookieLocale) ? cookieLocale : DEFAULT_LOCALE;
  return { locale, messages: await loadMessages(locale) };
});

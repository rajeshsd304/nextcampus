/**
 * Locale configuration. To add a locale: add it here, add messages/<locale>.json
 * with every key from messages/en.json (enforced by tests/unit/i18n.test.ts),
 * and add its Intl tag to INTL_LOCALE.
 */
export const LOCALES = ["bn", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "bn";

export const LOCALE_COOKIE = "NEXT_LOCALE";
export const NUMERALS_COOKIE = "NC_NUMERALS";
export const PREFERENCE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export const NUMERAL_SYSTEMS = ["beng", "latn"] as const;
export type NumeralSystem = (typeof NUMERAL_SYSTEMS)[number];

/** Default digits per locale: Bangla digits for bn, Latin digits for en. */
export const DEFAULT_NUMERALS: Record<Locale, NumeralSystem> = { bn: "beng", en: "latn" };

/** BCP 47 tags used for Intl formatting. */
export const INTL_LOCALE: Record<Locale, string> = { bn: "bn-BD", en: "en-GB" };

/** Native names, shown in the language switcher regardless of the active locale. */
export const LOCALE_NATIVE_NAMES: Record<Locale, string> = { bn: "বাংলা", en: "English" };

/** Default time zone for visitors without a profile (Bangladesh Standard Time). */
export const DEFAULT_TIME_ZONE = "Asia/Dhaka";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

export function isNumeralSystem(value: unknown): value is NumeralSystem {
  return typeof value === "string" && (NUMERAL_SYSTEMS as readonly string[]).includes(value);
}

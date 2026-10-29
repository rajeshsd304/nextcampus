import {
  DEFAULT_NUMERALS,
  DEFAULT_TIME_ZONE,
  INTL_LOCALE,
  type Locale,
  type NumeralSystem,
} from "@/i18n/config";

/** Everything needed to format values for a viewer. Serializable (safe to pass to Client Components). */
export type FormatContext = { locale: Locale; numerals: NumeralSystem; timeZone: string };

export function formatContext(
  locale: Locale,
  options: { numerals?: NumeralSystem | null; timeZone?: string | null } = {},
): FormatContext {
  return {
    locale,
    numerals: options.numerals ?? DEFAULT_NUMERALS[locale],
    timeZone: options.timeZone ?? DEFAULT_TIME_ZONE,
  };
}

function intlTag(ctx: Pick<FormatContext, "locale" | "numerals">): string {
  return `${INTL_LOCALE[ctx.locale]}-u-nu-${ctx.numerals}`;
}

export function formatNumber(value: number, ctx: FormatContext, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(intlTag(ctx), options).format(value);
}

/** Bangladeshi Taka, shown with the ৳ symbol. Whole taka unless `fractionDigits` is given. */
export function formatBdt(amount: number, ctx: FormatContext, fractionDigits = 0): string {
  return new Intl.NumberFormat(intlTag(ctx), {
    style: "currency",
    currency: "BDT",
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(amount);
}

export function formatDateTime(value: string | Date, ctx: FormatContext): string {
  return new Intl.DateTimeFormat(intlTag(ctx), {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: ctx.timeZone,
  }).format(new Date(value));
}

export function formatDate(
  value: string | Date,
  ctx: FormatContext,
  options: Intl.DateTimeFormatOptions = { dateStyle: "long" },
): string {
  return new Intl.DateTimeFormat(intlTag(ctx), { timeZone: ctx.timeZone, ...options }).format(
    new Date(value),
  );
}

const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 60 * 60 * 24 * 365],
  ["month", 60 * 60 * 24 * 30],
  ["week", 60 * 60 * 24 * 7],
  ["day", 60 * 60 * 24],
  ["hour", 60 * 60],
  ["minute", 60],
  ["second", 1],
];

export function formatRelativeTime(
  value: string | Date,
  ctx: Pick<FormatContext, "locale" | "numerals">,
  now: Date = new Date(),
): string {
  const formatter = new Intl.RelativeTimeFormat(intlTag(ctx), { numeric: "auto" });
  const seconds = Math.round((new Date(value).getTime() - now.getTime()) / 1000);
  for (const [unit, size] of RELATIVE_UNITS) {
    if (unit === "second" || Math.abs(seconds) >= size) {
      return unit === "second" && Math.abs(seconds) < 60
        ? formatter.format(0, "second")
        : formatter.format(Math.round(seconds / size), unit);
    }
  }
  return formatter.format(0, "second");
}

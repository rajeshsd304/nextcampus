import { describe, expect, it } from "vitest";
import { formatBdt, formatContext, formatDate, formatNumber, formatRelativeTime } from "@/lib/i18n-format";

describe("locale-aware formatting", () => {
  const bn = formatContext("bn");
  const en = formatContext("en");

  it("defaults to Bangla digits in bn and Latin digits in en", () => {
    expect(bn.numerals).toBe("beng");
    expect(en.numerals).toBe("latn");
    expect(formatNumber(2026, bn, { useGrouping: false })).toBe("২০২৬");
    expect(formatNumber(2026, en, { useGrouping: false })).toBe("2026");
  });

  it("lets Bangla readers choose Latin digits and vice versa", () => {
    expect(formatNumber(42, formatContext("bn", { numerals: "latn" }))).toBe("42");
    expect(formatNumber(42, formatContext("en", { numerals: "beng" }))).toBe("৪২");
  });

  it("formats Taka with the ৳ symbol", () => {
    expect(formatBdt(0, bn)).toContain("৳");
    expect(formatBdt(0, bn)).toContain("০");
    expect(formatBdt(1500, en)).toMatch(/৳\s?1,500/);
  });

  it("formats dates in Bangladesh time by default", () => {
    expect(bn.timeZone).toBe("Asia/Dhaka");
    // 20:30 UTC is 02:30 the next day in Dhaka.
    const value = "2026-10-29T20:30:00Z";
    expect(formatDate(value, en, { day: "numeric", month: "long" })).toBe("30 October");
    expect(formatDate(value, bn, { day: "numeric" })).toBe("৩০");
  });

  it("formats relative times in the reader's language", () => {
    const now = new Date("2026-10-29T12:00:00Z");
    expect(formatRelativeTime("2026-10-29T10:00:00Z", en, now)).toBe("2 hours ago");
    expect(formatRelativeTime("2026-10-29T10:00:00Z", bn, now)).toMatch(/২/);
  });
});

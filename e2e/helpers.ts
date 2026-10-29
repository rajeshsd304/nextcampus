import AxeBuilder from "@axe-core/playwright";
import { expect, type BrowserContext, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";
import type en from "../messages/en.json";

type Messages = typeof en;

function load(locale: "bn" | "en"): Messages {
  return JSON.parse(
    readFileSync(path.resolve(import.meta.dirname, `../messages/${locale}.json`), "utf8"),
  ) as Messages;
}

/** Message catalogs, so tests assert against the same copy the app renders. */
export const messages = { bn: load("bn"), en: load("en") } as const;
export type TestLocale = keyof typeof messages;

export const BASE_URL = process.env.E2E_BASE_URL ?? `http://localhost:${process.env.E2E_PORT ?? 3100}`;

/** Sets the locale cookie the app reads (same as using the language switcher). */
export async function setLocale(context: BrowserContext, locale: TestLocale): Promise<void> {
  await context.addCookies([{ name: "NEXT_LOCALE", value: locale, url: BASE_URL }]);
}

/** Escapes a message for use in a RegExp (ICU placeholders become wildcards). */
export function messagePattern(message: string, flags = "i"): RegExp {
  const escaped = message
    .replace(/<\/?\w+>/g, "")
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\\\{\w+\\\}/g, ".*");
  return new RegExp(escaped, flags);
}

export async function expectNoSeriousA11yViolations(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
}

export async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
}

/**
 * Interactive controls must be at least 44px tall (and icon/buttons 44px wide).
 * Inline links inside running text are exempt, as in WCAG 2.5.5/2.5.8.
 */
export async function undersizedTapTargets(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const viewportWidth = document.documentElement.clientWidth;
    const selector =
      "a[href], button, select, input:not([type=checkbox]):not([type=radio]):not([type=hidden]), summary, [role=button]";
    const failures: string[] = [];
    for (const el of Array.from(document.querySelectorAll<HTMLElement>(selector))) {
      if (el.closest("p, dd, figcaption, label")) continue; // inline text links
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      if (rect.width === 0 || rect.height === 0 || style.visibility === "hidden") continue;
      if (rect.right <= 0 || rect.left >= viewportWidth) continue; // off-screen (e.g. honeypot)
      if (el.closest("[aria-hidden=true]")) continue;
      // Visually hidden until focused (e.g. the skip link): measured in its focused state elsewhere.
      if (style.clipPath.includes("inset(50%)") || style.clip === "rect(0px, 0px, 0px, 0px)") continue;
      const isButtonLike = el.tagName === "BUTTON" || el.getAttribute("role") === "button";
      if (rect.height < 43.5 || (isButtonLike && rect.width < 43.5)) {
        failures.push(
          `${el.tagName.toLowerCase()} "${(el.textContent ?? el.getAttribute("aria-label") ?? "").trim().slice(0, 40)}" ${Math.round(rect.width)}x${Math.round(rect.height)}`,
        );
      }
    }
    return failures;
  });
}

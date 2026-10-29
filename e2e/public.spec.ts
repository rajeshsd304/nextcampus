import { expect, test } from "@playwright/test";
import {
  expectNoHorizontalOverflow,
  expectNoSeriousA11yViolations,
  messagePattern,
  messages,
  setLocale,
  undersizedTapTargets,
  type TestLocale,
} from "./helpers";

type Messages = (typeof messages)["en"];

/** Every public page with the h1 it must render, per locale (read from the message files). */
const PUBLIC_PAGES: { path: string; heading: (m: Messages) => string }[] = [
  { path: "/", heading: (m) => m.home.hero.title },
  { path: "/exams", heading: (m) => m.catalog.title },
  { path: "/features", heading: (m) => m.features.title },
  { path: "/solutions", heading: (m) => m.solutions.title },
  { path: "/pricing", heading: (m) => m.pricing.title },
  { path: "/faq", heading: (m) => m.faq.title },
  { path: "/contact", heading: (m) => m.contact.title },
  { path: "/legal/privacy", heading: (m) => m.legal.privacy.title },
  { path: "/legal/terms", heading: (m) => m.legal.terms.title },
  { path: "/legal/acceptable-use", heading: (m) => m.legal.acceptableUse.title },
  { path: "/sign-in", heading: (m) => m.authPages.signIn.title },
  { path: "/sign-up", heading: (m) => m.authPages.signUp.title },
];

const REDESIGNED = ["/", "/exams", "/pricing", "/faq", "/features", "/contact"];
const LOCALES: TestLocale[] = ["bn", "en"];

test.beforeEach(async ({ page }) => {
  // Reduced motion disables entrance animations so contrast is measured on final colors.
  await page.emulateMedia({ reducedMotion: "reduce" });
});

for (const locale of LOCALES) {
  for (const { path, heading } of PUBLIC_PAGES) {
    test(`[${locale}] ${path} renders one h1, correct lang and no serious a11y violations`, async ({
      page,
      context,
    }) => {
      await setLocale(context, locale);
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await expect(page.locator("html")).toHaveAttribute("lang", locale);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(
        messagePattern(heading(messages[locale])),
      );
      await expect(page.locator("h1")).toHaveCount(1);
      await expectNoSeriousA11yViolations(page);
      await expectNoHorizontalOverflow(page);
    });
  }

  for (const path of REDESIGNED) {
    test(`[${locale}] ${path} meets contrast requirements in dark mode`, async ({ page, context }) => {
      await setLocale(context, locale);
      await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
      await page.goto(path);
      await expect(page.locator("html")).toHaveClass(/dark/);
      await expectNoSeriousA11yViolations(page);
    });
  }
}

test.describe("responsive layouts", () => {
  for (const width of [360, 390, 768, 1280]) {
    test(`no horizontal overflow and 44px tap targets at ${width}px`, async ({ page, context }) => {
      await setLocale(context, "bn");
      await page.setViewportSize({ width, height: 900 });
      for (const path of [...REDESIGNED, "/sign-in", "/sign-up"]) {
        await page.goto(path);
        await expectNoHorizontalOverflow(page);
        if (width < 1280)
          expect({ path, undersized: await undersizedTapTargets(page) }).toEqual({ path, undersized: [] });
      }
    });
  }
});

test.describe("language switching", () => {
  test("defaults to Bangla, switches to English and back, and persists the choice", async ({
    page,
    isMobile,
  }) => {
    await page.goto("/pricing");
    await expect(page.locator("html")).toHaveAttribute("lang", "bn");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(messages.bn.pricing.title);

    const switcher = isMobile ? page.locator("footer") : page.locator("header");
    await switcher
      .getByRole("button", {
        name: messagePattern(messages.bn.locale.switchTo.replace("{language}", "English")),
      })
      .click();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(messages.en.pricing.title);

    await page.goto("/faq");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(messages.en.faq.title);
    const cookies = await page.context().cookies();
    expect(cookies.find((c) => c.name === "NEXT_LOCALE")?.value).toBe("en");

    await page
      .locator("footer")
      .getByRole("button", {
        name: messagePattern(messages.en.locale.switchTo.replace("{language}", "বাংলা")),
      })
      .click();
    await expect(page.locator("html")).toHaveAttribute("lang", "bn");
  });

  test("the switcher marks the active language and has an accessible group label", async ({ page }) => {
    await page.goto("/");
    const group = page.locator("footer").getByRole("group", { name: messages.bn.locale.label });
    await expect(group.getByRole("button", { pressed: true })).toHaveText("বাংলা");
    await expect(group.getByRole("button", { pressed: false })).toHaveText("English");
  });

  test("uses a Bengali font with Bengali-safe line height", async ({ page }) => {
    await page.goto("/");
    const metrics = await page.locator("h1").evaluate((el) => {
      const style = getComputedStyle(el);
      return {
        family: style.fontFamily,
        lineHeight: parseFloat(style.lineHeight) / parseFloat(style.fontSize),
      };
    });
    expect(metrics.family).toMatch(/Hind Siliguri|bengali/i);
    expect(metrics.lineHeight).toBeGreaterThanOrEqual(1.25);
  });

  test("shows Bangla digits and ৳ prices", async ({ page }) => {
    await page.goto("/pricing");
    // CLDR bn-BD places the symbol after the amount ("০৳"); accept either order.
    await expect(page.getByText(/^\s*(৳\s?০|০\s?৳)\s*$/).first()).toBeVisible();
  });
});

test("dark mode toggles and persists", async ({ page, context }) => {
  await setLocale(context, "en");
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  const toggle = page.getByRole("button", { name: /color theme/i });
  await toggle.click(); // system → light
  await toggle.click(); // light → dark
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.reload();
  await expect(page.locator("html")).toHaveClass(/dark/);
});

test("skip link moves focus to main content", async ({ page }) => {
  await page.goto("/features");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: messages.bn.common.skipToContent });
  await expect(skip).toBeFocused();
  await skip.press("Enter");
  await expect(page).toHaveURL(/#main$/);
});

test("navigation works on desktop and mobile", async ({ page, isMobile, context }) => {
  await setLocale(context, "en");
  await page.goto("/");
  if (isMobile) {
    await page.getByRole("button", { name: "Open menu" }).click();
    const dialog = page.getByRole("dialog", { name: "Menu" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("link", { name: messages.en.nav.pricing }).click();
  } else {
    await page
      .getByRole("navigation", { name: "Main" })
      .getByRole("link", { name: messages.en.nav.pricing })
      .click();
  }
  await expect(page).toHaveURL(/\/pricing$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(messages.en.pricing.title);
});

test("SEO endpoints are served", async ({ request }) => {
  const robots = await request.get("/robots.txt");
  expect(robots.ok()).toBe(true);
  const robotsText = await robots.text();
  expect(robotsText).toContain("Disallow: /dashboard");
  expect(robotsText).toContain("Sitemap:");

  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.ok()).toBe(true);
  const sitemapText = await sitemap.text();
  expect(sitemapText).toContain("/pricing</loc>");
  expect(sitemapText).toContain("/exams</loc>");

  const og = await request.get("/opengraph-image");
  expect(og.ok()).toBe(true);
  expect(og.headers()["content-type"]).toContain("image/png");
});

test("pages expose localized Open Graph metadata", async ({ page, context }) => {
  await setLocale(context, "en");
  await page.goto("/pricing");
  await expect(page).toHaveTitle(`${messages.en.pricing.metaTitle} · NextCampus`);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", /opengraph-image/);
  await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute("content", "en_GB");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/pricing$/);
});

test("pricing is honest: no checkout, Premium marked coming soon", async ({ page, context }) => {
  await setLocale(context, "en");
  await page.goto("/pricing");
  await expect(page.getByText(messages.en.pricing.noticeTitle)).toBeVisible();
  await expect(page.getByRole("button", { name: messages.en.plans.premium.cta })).toBeDisabled();
  await expect(page.getByText(messages.en.plans.priceTba).first()).toBeVisible();
});

test("contact form validates on the client in both languages", async ({ page, context }) => {
  await page.goto("/contact?topic=support");
  await page.getByRole("button", { name: messages.bn.contactForm.submit }).click();
  await expect(page.getByText(messages.bn.validation.nameRequired)).toBeVisible();

  await setLocale(context, "en");
  await page.goto("/contact?topic=support");
  await expect(page.getByLabel(messages.en.contactForm.topic)).toHaveValue("support");
  await page.getByRole("button", { name: messages.en.contactForm.submit }).click();
  await expect(page.getByText(messages.en.validation.nameRequired)).toBeVisible();
  await expect(page.getByLabel(messages.en.contactForm.name)).toHaveAttribute("aria-invalid", "true");
});

test("the catalog shows an accessible error state when the database is unreachable", async ({
  page,
  context,
}) => {
  test.skip(Boolean(process.env.E2E_SUPABASE), "Only meaningful without a database");
  await setLocale(context, "en");
  const response = await page.goto("/exams");
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { name: messages.en.catalog.unavailableTitle })).toBeVisible();
  await expect(page.getByText(messages.en.catalog.comingSoonTitle)).toBeVisible();
});

test("the focused skip link is a 44px target", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  const box = await page.getByRole("link", { name: messages.bn.common.skipToContent }).boundingBox();
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(43.5);
});

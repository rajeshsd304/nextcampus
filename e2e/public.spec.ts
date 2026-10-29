import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const PUBLIC_PAGES = [
  { path: "/", heading: /secure, trusted/i },
  { path: "/features", heading: /everything an institution needs/i },
  { path: "/exams", heading: /assessments for every kind of learning/i },
  { path: "/solutions", heading: /built for the way your institution assesses/i },
  { path: "/pricing", heading: /plans that grow/i },
  { path: "/faq", heading: /frequently asked questions/i },
  { path: "/contact", heading: /let's talk/i },
  { path: "/legal/privacy", heading: /privacy policy/i },
  { path: "/legal/terms", heading: /terms of service/i },
  { path: "/legal/acceptable-use", heading: /acceptable use policy/i },
  { path: "/sign-in", heading: /welcome back/i },
  { path: "/sign-up", heading: /create your account/i },
];

for (const { path, heading } of PUBLIC_PAGES) {
  test(`${path} renders, has a single h1 and no serious a11y violations`, async ({ page }) => {
    // Reduced motion disables entrance animations so contrast is measured on final colors.
    await page.emulateMedia({ reducedMotion: "reduce" });
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading);
    await expect(page.locator("h1")).toHaveCount(1);

    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);

    // No horizontal overflow at any viewport.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
}

test("dark mode toggles and persists", async ({ page }) => {
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
  const skip = page.getByRole("link", { name: "Skip to main content" });
  await expect(skip).toBeFocused();
  await skip.press("Enter");
  await expect(page).toHaveURL(/#main$/);
});

test("navigation works on desktop and mobile", async ({ page, isMobile }) => {
  await page.goto("/");
  if (isMobile) {
    await page.getByRole("button", { name: "Open menu" }).click();
    const dialog = page.getByRole("dialog", { name: "Menu" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("link", { name: "Pricing" }).click();
  } else {
    await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Pricing" }).click();
  }
  await expect(page).toHaveURL(/\/pricing$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/plans that grow/i);
});

test("SEO endpoints are served", async ({ request }) => {
  const robots = await request.get("/robots.txt");
  expect(robots.ok()).toBe(true);
  const robotsText = await robots.text();
  expect(robotsText).toContain("Disallow: /dashboard");
  expect(robotsText).toContain("Sitemap:");

  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.ok()).toBe(true);
  expect(await sitemap.text()).toContain("/pricing</loc>");

  const og = await request.get("/opengraph-image");
  expect(og.ok()).toBe(true);
  expect(og.headers()["content-type"]).toContain("image/png");
});

test("pages expose Open Graph metadata", async ({ page }) => {
  await page.goto("/pricing");
  await expect(page).toHaveTitle(/Pricing · NextCampus/);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", /opengraph-image/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/pricing$/);
});

test("contact form validates on the client", async ({ page }) => {
  await page.goto("/contact?topic=support");
  await expect(page.getByLabel("Topic")).toHaveValue("support");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByText("Enter your name.")).toBeVisible();
  await expect(page.getByLabel("Name")).toHaveAttribute("aria-invalid", "true");
});

for (const path of ["/", "/pricing", "/sign-in", "/contact"]) {
  test(`${path} meets contrast requirements in dark mode`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
    await page.goto(path);
    await expect(page.locator("html")).toHaveClass(/dark/);
    const results = await new AxeBuilder({ page }).withTags(["wcag2aa"]).analyze();
    const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
  });
}

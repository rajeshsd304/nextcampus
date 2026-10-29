import { expect, test } from "@playwright/test";
import { messagePattern, messages, setLocale } from "./helpers";

const en = messages.en;

const PROTECTED = [
  "/dashboard",
  "/o/northbridge/admin",
  "/o/public/student",
  "/settings",
  "/settings/security",
  "/notifications",
  "/onboarding",
  "/invitations",
  "/platform",
  "/platform/catalog",
];

for (const path of PROTECTED) {
  test(`signed-out visitors are redirected from ${path} to sign-in`, async ({ page }) => {
    await page.goto(path);
    await expect(page).toHaveURL(
      (url) => url.pathname === "/sign-in" && url.searchParams.get("next") === path,
    );
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(messages.bn.authPages.signIn.title);
  });
}

test.describe("in English", () => {
  test.beforeEach(async ({ context }) => setLocale(context, "en"));

  test("sign-in offers Google and validates email/password", async ({ page }) => {
    await page.goto("/sign-in");
    await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
    await page.getByRole("button", { name: en.authForms.signIn, exact: true }).click();
    await expect(page.getByText(en.validation.emailRequired)).toBeVisible();
    await expect(page.getByText(en.validation.passwordRequired)).toBeVisible();
    await page.getByLabel(en.authForms.email).fill("not-an-email");
    await page.getByRole("button", { name: en.authForms.signIn, exact: true }).click();
    await expect(page.getByText(en.validation.emailInvalid)).toBeVisible();
  });

  test("password visibility can be toggled accessibly", async ({ page }) => {
    await page.goto("/sign-in");
    const password = page.getByLabel(en.authForms.password, { exact: true });
    await expect(password).toHaveAttribute("type", "password");
    await page.getByRole("button", { name: en.authForms.showPassword }).click();
    await expect(password).toHaveAttribute("type", "text");
    await expect(page.getByRole("button", { name: en.authForms.hidePassword })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  test("sign-up enforces password rules and terms", async ({ page }) => {
    await page.goto("/sign-up");
    await page.getByLabel(en.authForms.fullName).fill("Ada Lovelace");
    await page.getByLabel(en.authForms.email).fill("ada@example.com");
    await page.getByLabel(en.authForms.password, { exact: true }).fill("short");
    await page.getByRole("button", { name: en.authForms.createAccount }).click();
    await expect(page.getByText(en.validation.passwordMin)).toBeVisible();
    await expect(page.getByText(en.validation.acceptTerms)).toBeVisible();
  });

  test("unsafe next parameters are not propagated", async ({ page }) => {
    await page.goto("/sign-in?next=//evil.example/phish");
    await expect(page.getByRole("link", { name: en.authPages.signIn.createAccount })).toHaveAttribute(
      "href",
      "/sign-up?next=%2Fdashboard",
    );
    await expect(page.locator('input[name="next"]')).toHaveValue("/dashboard");
  });

  test("auth error codes render a friendly message", async ({ page }) => {
    await page.goto("/sign-in?error=link_expired");
    await expect(
      page.getByRole("alert").filter({ hasText: messagePattern(en.authPages.urlErrors.link_expired) }),
    ).toBeVisible();
  });

  test("malformed invitation links show a not-found state", async ({ page }) => {
    await page.goto("/invite/not-a-real-token");
    await expect(page.getByRole("heading", { name: en.invitePage.notFoundTitle })).toBeVisible();
    await expect(page.locator('meta[name="referrer"]')).toHaveAttribute("content", "no-referrer");
  });
});

test("sign-in works in Bangla too", async ({ page }) => {
  await page.goto("/sign-in");
  await expect(page.getByRole("button", { name: messages.bn.authForms.continueWithGoogle })).toBeVisible();
  await page.getByRole("button", { name: messages.bn.authForms.signIn, exact: true }).click();
  await expect(page.getByText(messages.bn.validation.emailRequired)).toBeVisible();
});

test("auth callback without a code fails safely", async ({ page }) => {
  await page.goto("/auth/callback?next=https://evil.example");
  await expect(page).toHaveURL(
    (url) => url.pathname === "/sign-in" && url.searchParams.get("error") === "oauth_failed",
  );
});

test("security headers are set", async ({ request }) => {
  const response = await request.get("/");
  expect(response.headers()["x-frame-options"]).toBe("DENY");
  expect(response.headers()["x-content-type-options"]).toBe("nosniff");
  expect(response.headers()["x-powered-by"]).toBeUndefined();
});

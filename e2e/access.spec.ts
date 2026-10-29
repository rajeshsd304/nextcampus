import { expect, test } from "@playwright/test";

const PROTECTED = [
  "/dashboard",
  "/o/northbridge/admin",
  "/o/northbridge/student",
  "/settings",
  "/settings/security",
  "/notifications",
  "/onboarding",
  "/invitations",
  "/platform",
];

for (const path of PROTECTED) {
  test(`signed-out visitors are redirected from ${path} to sign-in`, async ({ page }) => {
    await page.goto(path);
    await expect(page).toHaveURL(
      (url) => url.pathname === "/sign-in" && url.searchParams.get("next") === path,
    );
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/welcome back/i);
  });
}

test("sign-in offers Google and validates email/password", async ({ page }) => {
  await page.goto("/sign-in");
  await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByText("Enter your email address.")).toBeVisible();
  await expect(page.getByText("Enter your password.")).toBeVisible();
  await page.getByLabel("Email").fill("not-an-email");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByText("Enter a valid email address.")).toBeVisible();
});

test("password visibility can be toggled accessibly", async ({ page }) => {
  await page.goto("/sign-in");
  const password = page.getByLabel("Password", { exact: true });
  await expect(password).toHaveAttribute("type", "password");
  await page.getByRole("button", { name: "Show password" }).click();
  await expect(password).toHaveAttribute("type", "text");
  await expect(page.getByRole("button", { name: "Hide password" })).toHaveAttribute("aria-pressed", "true");
});

test("sign-up enforces password rules and terms", async ({ page }) => {
  await page.goto("/sign-up");
  await page.getByLabel("Full name").fill("Ada Lovelace");
  await page.getByLabel("Work or school email").fill("ada@example.com");
  await page.getByLabel("Password", { exact: true }).fill("short");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Use at least 10 characters.")).toBeVisible();
  await expect(page.getByText("You must accept the terms to continue.")).toBeVisible();
});

test("unsafe next parameters are not propagated", async ({ page }) => {
  await page.goto("/sign-in?next=//evil.example/phish");
  const signUpLink = page.getByRole("link", { name: "Create an account" });
  await expect(signUpLink).toHaveAttribute("href", "/sign-up?next=%2Fdashboard");
  await expect(page.locator('input[name="next"]')).toHaveValue("/dashboard");
});

test("auth error codes render a friendly message", async ({ page }) => {
  await page.goto("/sign-in?error=link_expired");
  await expect(page.getByRole("alert").filter({ hasText: /expired or was already used/i })).toBeVisible();
});

test("malformed invitation links show a not-found state", async ({ page }) => {
  await page.goto("/invite/not-a-real-token");
  await expect(page.getByRole("heading", { name: "Invitation not found" })).toBeVisible();
  await expect(page.locator('meta[name="referrer"]')).toHaveAttribute("content", "no-referrer");
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

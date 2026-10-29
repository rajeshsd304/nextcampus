import { expect, test, type Page } from "@playwright/test";

/**
 * Full-stack flows against the local Supabase stack with seed data
 * (`npm run db:start && npm run db:reset`). Enable with E2E_SUPABASE=1.
 */
test.skip(!process.env.E2E_SUPABASE, "Requires local Supabase (set E2E_SUPABASE=1)");
test.describe.configure({ mode: "serial" });

const PASSWORD = "NextCampus-Dev-2026!";
const SEED_INVITE = `/invite/${"5eed".repeat(16)}`;

async function signIn(page: Page, email: string, next?: string) {
  await page.goto(next ? `/sign-in?next=${encodeURIComponent(next)}` : "/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
}

test("each role lands on its own dashboard only", async ({ browser }) => {
  const cases = [
    { email: "admin@northbridge.test", home: "/o/northbridge/admin", forbidden: "/o/northbridge/student" },
    {
      email: "instructor@northbridge.test",
      home: "/o/northbridge/instructor",
      forbidden: "/o/northbridge/admin",
    },
    {
      email: "reviewer@northbridge.test",
      home: "/o/northbridge/review",
      forbidden: "/o/northbridge/instructor",
    },
    {
      email: "student@northbridge.test",
      home: "/o/northbridge/student",
      forbidden: "/o/northbridge/admin/members",
    },
  ];
  for (const c of cases) {
    const context = await browser.newContext();
    const page = await context.newPage();
    await signIn(page, c.email);
    await expect(page).toHaveURL(new RegExp(`${c.home}$`));
    const response = await page.goto(c.forbidden);
    expect(response?.status()).toBe(403);
    await expect(page.getByRole("heading", { name: /don't have access/i })).toBeVisible();
    await context.close();
  }
});

test("other tenants' workspaces are not found", async ({ page }) => {
  await signIn(page, "admin@apex.test");
  await expect(page).toHaveURL(/\/o\/apex-coaching\/admin$/);
  const response = await page.goto("/o/northbridge/admin");
  expect(response?.status()).toBe(404);
});

test("super admin reaches the platform console; others are forbidden", async ({ browser }) => {
  const admin = await browser.newContext();
  const adminPage = await admin.newPage();
  await signIn(adminPage, "superadmin@nextcampus.test");
  await expect(adminPage).toHaveURL(/\/platform$/);
  await expect(adminPage.getByRole("heading", { name: "Platform console" })).toBeVisible();
  await admin.close();

  const other = await browser.newContext();
  const otherPage = await other.newPage();
  await signIn(otherPage, "student@northbridge.test");
  const response = await otherPage.goto("/platform");
  expect(response?.status()).toBe(403);
  await other.close();
});

test("newcomer completes profile, accepts invite and reaches the student dashboard", async ({ page }) => {
  await signIn(page, "newuser@nextcampus.test", SEED_INVITE);
  await expect(page.getByRole("heading", { name: /join northbridge university/i })).toBeVisible();
  await page.getByRole("button", { name: "Accept invitation" }).click();
  // Profile is incomplete, so onboarding comes first.
  await expect(page).toHaveURL(/\/onboarding/);
  await page.getByLabel("Full name").fill("Noor Newcomer");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL(/\/o\/northbridge\/student$/);
  await expect(page.getByRole("heading", { name: /hi, noor/i })).toBeVisible();
});

test("org admin can invite and the invitation appears in history", async ({ page }) => {
  await signIn(page, "admin@northbridge.test");
  await page.goto("/o/northbridge/admin/invitations");
  const email = `e2e-${Date.now()}@example.com`;
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Role").selectOption("instructor");
  await page.getByRole("button", { name: "Send invitation" }).click();
  await expect(page.getByRole("status").filter({ hasText: /invitation/i })).toBeVisible();
  await expect(page.getByText(email).first()).toBeVisible();
  await page.goto("/o/northbridge/admin/audit");
  await expect(page.getByText("Invitation sent").first()).toBeVisible();
});

import { createClient } from "@supabase/supabase-js";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { BASE_URL, messagePattern, messages, setLocale } from "./helpers";

/**
 * Full-stack flows against the local Supabase stack with reference data and
 * seed (`npm run db:start && npm run db:reset`). Enable with E2E_SUPABASE=1.
 * Email confirmation links are read from the local Mailpit inbox.
 */
test.skip(!process.env.E2E_SUPABASE, "Requires local Supabase (set E2E_SUPABASE=1)");
test.describe.configure({ mode: "serial" });

const PASSWORD = "NextCampus-Dev-2026!";
const SEED_INVITE = `/invite/${"5eed".repeat(16)}`;
const MAILPIT = process.env.E2E_MAILPIT_URL ?? "http://127.0.0.1:54324";
const en = messages.en;
const bn = messages.bn;

function supabaseAnon() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: { persistSession: false },
    },
  );
}

async function signIn(page: Page, email: string, next?: string) {
  await page.goto(next ? `/sign-in?next=${encodeURIComponent(next)}` : "/sign-in");
  await page.getByLabel(en.authForms.email).fill(email);
  await page.getByLabel(en.authForms.password, { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: en.authForms.signIn, exact: true }).click();
}

async function englishContext(context: BrowserContext) {
  await setLocale(context, "en");
}

async function confirmationLink(email: string): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const search = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}`);
    const { messages: found } = (await search.json()) as { messages: { ID: string }[] };
    if (found.length > 0) {
      const message = (await (await fetch(`${MAILPIT}/api/v1/message/${found[0]!.ID}`)).json()) as {
        HTML: string;
      };
      const href = /href="([^"]*\/auth\/confirm[^"]*)"/.exec(message.HTML)?.[1];
      if (href) {
        const url = new URL(href.replaceAll("&amp;", "&"));
        return `${BASE_URL}${url.pathname}${url.search}`;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`No confirmation email for ${email}`);
}

test.beforeEach(async ({ context }) => englishContext(context));

test("each role lands on its own dashboard only (Phase 1 behaviour preserved)", async ({ browser }) => {
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
    await englishContext(context);
    const page = await context.newPage();
    await signIn(page, c.email);
    await expect(page).toHaveURL(new RegExp(`${c.home}$`));
    const response = await page.goto(c.forbidden);
    expect(response?.status()).toBe(403);
    await expect(page.getByRole("heading", { name: en.states.forbidden.title })).toBeVisible();
    await context.close();
  }
});

test("other tenants' workspaces are not found", async ({ page }) => {
  await signIn(page, "admin@apex.test");
  await expect(page).toHaveURL(/\/o\/apex-coaching\/admin$/);
  const response = await page.goto("/o/northbridge/admin");
  expect(response?.status()).toBe(404);
});

test("a new self-signup student lands in the public organization's student dashboard", async ({ page }) => {
  const email = `e2e-student-${Date.now()}@example.com`;
  await page.goto("/sign-up");
  await page.getByLabel(en.authForms.fullName).fill("Test Student");
  await page.getByLabel(en.authForms.email).fill(email);
  await page.getByLabel(en.authForms.password, { exact: true }).fill(PASSWORD);
  await page.getByLabel(messagePattern(en.authForms.acceptTerms)).check();
  await page.getByRole("button", { name: en.authForms.createAccount }).click();
  await expect(page.getByRole("heading", { name: en.authForms.checkInboxTitle })).toBeVisible();

  await page.goto(await confirmationLink(email));
  await expect(page).toHaveURL(/\/onboarding/);
  await page.getByRole("button", { name: en.profileForm.continue }).click();

  await expect(page).toHaveURL(/\/o\/public\/student$/);
  await expect(page.getByText(en.orgs.publicName).first()).toBeVisible();
  await expect(page.getByText(en.dashboards.student.privacyNote)).toBeVisible();
});

test("public students cannot see other members — UI, routes and direct Supabase access", async ({ page }) => {
  await signIn(page, "learner@nextcampus.test");
  await expect(page).toHaveURL(/\/o\/public\/student$/);
  for (const path of [
    "/o/public/admin",
    "/o/public/admin/members",
    "/o/public/instructor",
    "/o/public/review",
  ]) {
    expect((await page.goto(path))?.status(), path).toBe(403);
  }

  const supabase = supabaseAnon();
  const { data: auth, error } = await supabase.auth.signInWithPassword({
    email: "learner@nextcampus.test",
    password: PASSWORD,
  });
  expect(error).toBeNull();
  const members = await supabase.from("organization_members").select("user_id");
  expect(members.data?.map((m) => m.user_id)).toEqual([auth.user!.id]);
  const profiles = await supabase.from("profiles").select("id, email");
  expect(profiles.data?.map((p) => p.id)).toEqual([auth.user!.id]);
  const other = await supabase.from("profiles").select("id").eq("email", "learner2@nextcampus.test");
  expect(other.data).toEqual([]);
});

test("a student in both the public org and a coaching center can switch workspaces", async ({ page }) => {
  await signIn(page, "dual@nextcampus.test");
  await expect(page).toHaveURL(/\/o\/apex-coaching\/student$/);
  await page.getByRole("button", { name: messagePattern(en.shell.orgSwitcher.current) }).click();
  await page.getByRole("menuitem", { name: messagePattern(en.orgs.publicName) }).click();
  await expect(page).toHaveURL(/\/o\/public\/student$/);
});

test("locale preference is saved to the profile and restored at sign-in", async ({ browser }) => {
  const first = await browser.newContext();
  await setLocale(first, "en");
  const page = await first.newPage();
  await signIn(page, "learner2@nextcampus.test");
  await page.goto("/settings");
  await page.getByLabel(en.profileForm.preferences.language).selectOption("bn");
  await page.getByRole("button", { name: en.profileForm.preferences.save }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "bn");
  await first.close();

  // A fresh browser with an English cookie gets Bangla back after signing in.
  const second = await browser.newContext();
  await setLocale(second, "en");
  const again = await second.newPage();
  await signIn(again, "learner2@nextcampus.test");
  await expect(again.locator("html")).toHaveAttribute("lang", "bn");
  await second.close();
});

test("the newcomer completes profile, accepts the invite and reaches the student dashboard", async ({
  page,
}) => {
  await signIn(page, "newuser@nextcampus.test", SEED_INVITE);
  await expect(page.getByRole("heading", { name: messagePattern(en.invitePage.title) })).toBeVisible();
  await page.getByRole("button", { name: en.invitationForms.response.accept }).click();
  await expect(page).toHaveURL(/\/onboarding/);
  await page.getByLabel(en.profileForm.fullName).fill("Noor Newcomer");
  await page.getByRole("button", { name: en.profileForm.continue }).click();
  await expect(page).toHaveURL(/\/o\/northbridge\/student$/);
});

test("coaching-center admin keeps their workspace and cannot manage the catalog", async ({ page }) => {
  await signIn(page, "admin@apex.test");
  await page.goto("/o/apex-coaching/admin/invitations");
  const email = `e2e-${Date.now()}@example.com`;
  await page.getByLabel(en.invitationForms.email).fill(email);
  await page.getByLabel(en.invitationForms.role).selectOption("grader");
  await page.getByRole("button", { name: en.invitationForms.submit }).click();
  await expect(page.getByText(email).first()).toBeVisible();

  expect((await page.goto("/platform/catalog"))?.status()).toBe(403);
  expect((await page.goto("/platform/catalog/universities/new"))?.status()).toBe(403);

  const supabase = supabaseAnon();
  await supabase.auth.signInWithPassword({ email: "admin@apex.test", password: PASSWORD });
  const { data: categories } = await supabase.from("university_categories").select("key").limit(1);
  const insert = await supabase.from("universities").insert({
    slug: "zz-forbidden",
    name_en: "Forbidden",
    name_bn: "নিষিদ্ধ",
    short_code: "ZZ",
    category_key: categories![0]!.key,
  });
  expect(insert.error?.message).toMatch(/row-level security/);
  const update = await supabase
    .from("universities")
    .update({ is_active: false })
    .neq("slug", "")
    .select("id");
  expect(update.data).toEqual([]);
});

test("platform admin adds a university, sees it in both languages, then deactivates it", async ({
  browser,
}) => {
  const admin = await browser.newContext();
  await setLocale(admin, "en");
  const page = await admin.newPage();
  await signIn(page, "superadmin@nextcampus.test");

  const slug = `e2e-uni-${Date.now()}`;
  const nameEn = `E2E Test University ${slug.slice(-5)}`;
  const nameBn = `পরীক্ষামূলক বিশ্ববিদ্যালয় ${slug.slice(-5)}`;
  await page.goto("/platform/catalog/universities/new");
  await page.getByLabel(en.catalogAdmin.form.nameBn).fill(nameBn);
  await page.getByLabel(en.catalogAdmin.form.nameEn).fill(nameEn);
  await page.getByLabel(en.catalogAdmin.form.slug).fill(slug);
  await page.getByLabel(en.catalogAdmin.form.shortCode).fill("E2E");
  await page.getByRole("button", { name: en.catalogAdmin.form.save }).click();
  await expect(page).toHaveURL(/\/platform\/catalog$/);

  // Add an exam target so the university is listed in the catalog.
  await page.goto("/platform/catalog/targets/new");
  await page.getByLabel(en.catalogAdmin.form.university).selectOption({ label: nameEn });
  await page.getByLabel(en.catalogAdmin.form.slug).fill(`${slug}-unit`);
  await page.getByLabel(en.catalogAdmin.form.nameBn).fill("বিজ্ঞান ইউনিট");
  await page.getByLabel(en.catalogAdmin.form.nameEn).fill("Science unit");
  await page.getByRole("button", { name: en.catalogAdmin.form.save }).click();
  await expect(page).toHaveURL(/\/platform\/catalog$/);

  const visitor = await browser.newContext();
  const pub = await visitor.newPage();
  await pub.goto("/exams");
  await expect(pub.getByRole("heading", { name: messagePattern(nameBn) })).toBeVisible();
  await setLocale(visitor, "en");
  await pub.goto("/exams");
  await expect(pub.getByRole("heading", { name: messagePattern(nameEn) })).toBeVisible();
  await expect(pub.getByRole("option", { name: nameEn })).toHaveCount(1);
  expect(await (await pub.request.get("/sitemap.xml")).text()).toContain(`/exams/${slug}</loc>`);

  await page
    .getByRole("button", {
      name: messagePattern(en.catalogAdmin.row.deactivateNamed.replace("{name}", `${nameEn} (E2E)`)),
    })
    .click();
  await page.getByRole("alertdialog").getByRole("button", { name: en.catalogAdmin.row.deactivate }).click();
  await expect(page.getByText(en.catalogAdmin.inactive).first()).toBeVisible();

  await pub.goto("/exams");
  await expect(pub.getByRole("heading", { name: messagePattern(nameEn) })).toHaveCount(0);
  expect((await pub.goto(`/exams/${slug}`))?.status()).toBe(404);

  await page.goto("/platform/catalog");
  await expect(
    page.getByText(messagePattern(`${en.audit.actions.university.deactivated}`)).first(),
  ).toBeVisible();
  await admin.close();
  await visitor.close();
});

test("the catalog shows exactly the active seeded data", async ({ page }) => {
  const supabase = supabaseAnon();
  const { data: universities } = await supabase
    .from("universities")
    .select("slug, name_bn, exam_targets(id)");
  const withTargets = (universities ?? []).filter((u) => u.exam_targets.length > 0);
  expect(withTargets.length).toBeGreaterThan(0);

  await setLocale(page.context(), "bn");
  await page.goto("/exams");
  for (const university of withTargets) {
    await expect(page.locator(`#uni-${university.slug}`)).toContainText(university.name_bn);
  }
  await expect(page.getByText(bn.catalog.target.comingSoon).first()).toBeVisible();
});

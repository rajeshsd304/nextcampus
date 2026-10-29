import { createClient } from "@supabase/supabase-js";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import {
  expectNoSeriousA11yViolations,
  messagePattern,
  messages,
  setLocale,
  type TestLocale,
} from "./helpers";

/**
 * Question bank flows against the local Supabase stack with reference data
 * and seed (`npm run db:reset`). Enable with E2E_SUPABASE=1.
 */
test.skip(!process.env.E2E_SUPABASE, "Requires local Supabase (set E2E_SUPABASE=1)");
test.describe.configure({ mode: "serial" });

const PASSWORD = "NextCampus-Dev-2026!";
const en = messages.en;
const NORTH = "/o/northbridge/questions";

function anonClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: { persistSession: false },
    },
  );
}

async function signedInClient(email: string) {
  const client = anonClient();
  const { error } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  expect(error).toBeNull();
  return client;
}

async function signIn(page: Page, email: string) {
  await page.goto("/sign-in");
  await page.getByLabel(en.authForms.email).fill(email);
  await page.getByLabel(en.authForms.password, { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: en.authForms.signIn, exact: true }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/sign-in"));
}

async function asUser(context: BrowserContext, email: string, locale: TestLocale = "en"): Promise<Page> {
  await setLocale(context, locale);
  const page = await context.newPage();
  await signIn(page, email);
  return page;
}

/** Fills the MCQ editor in both languages; option B is correct. */
async function fillMcq(page: Page, stem: string) {
  const f = en.questionForms;
  await page.locator("#q-stem-bn").fill(`${stem} (বাংলা) $x^2$`);
  await page.locator("#q-stem-en").fill(`${stem} $x^2$`);
  for (const [index, letter] of ["A", "B", "C", "D"].entries()) {
    await page.locator(`#q-option-${index}-bn`).fill(`বিকল্প ${letter}`);
    await page.locator(`#q-option-${index}-en`).fill(`Option ${letter}`);
  }
  await page.getByRole("radio", { name: messagePattern(f.optionLabel.replace("{label}", "B")) }).check();
  await page.locator("#q-explanation-bn").fill("ব্যাখ্যা");
  await page.locator("#q-explanation-en").fill("Explanation");
}

async function saveAndOpen(page: Page, base: string): Promise<string> {
  await page.getByRole("button", { name: en.questionForms.saveDraft }).click();
  await page.waitForURL(new RegExp(`${base}/[0-9a-f-]{36}/edit`));
  const id = /([0-9a-f-]{36})\/edit/.exec(page.url())![1]!;
  await page.goto(`${base}/${id}`);
  return id;
}

let mcqId = "";

test("grader authors a bilingual MCQ, submits it, and cannot publish", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await asUser(context, "instructor@northbridge.test");
  await page.goto(`${NORTH}/new?type=mcq`);
  await expect(page.locator("#q-stem-bn")).toBeVisible();
  await fillMcq(page, `E2E MCQ ${Date.now()}`);
  await expect(page.locator(".katex").first()).toBeVisible();
  mcqId = await saveAndOpen(page, NORTH);

  await page.getByRole("button", { name: en.questionForms.transitions.actions.submit }).click();
  await expect(page.getByText(en.questionForms.transitionDone.submit)).toBeVisible();
  await expect(page.getByRole("button", { name: en.questionForms.transitions.actions.publish })).toHaveCount(
    0,
  );

  // The server refuses a publish even if the button is forced.
  const supabase = await signedInClient("instructor@northbridge.test");
  const { error } = await supabase.rpc("transition_question", { p_question_id: mcqId, p_action: "publish" });
  expect(error?.message).toBe("not_authorized");
  await context.close();
});

test("org admin rejects with a required reason, then approves and publishes", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await asUser(context, "admin@northbridge.test");
  await page.goto(`${NORTH}/review`);
  await page.locator(`a[href="${NORTH}/${mcqId}"]`).click();

  const t = en.questionForms.transitions;
  await page.getByRole("button", { name: t.actions.reject }).click();
  await page.getByRole("dialog").getByRole("button", { name: t.actions.reject }).click();
  await expect(page.getByText(en.validation.reasonRequired)).toBeVisible();
  await page.getByRole("dialog").getByLabel(t.reasonRequired).fill("Please add a diagram.");
  await page.getByRole("dialog").getByRole("button", { name: t.actions.reject }).click();
  await expect(page.getByText(en.questionForms.transitionDone.reject)).toBeVisible();
  await expect(page.getByText("Please add a diagram.").first()).toBeVisible();
  await context.close();

  const grader = await browser.newContext();
  const graderPage = await asUser(grader, "instructor@northbridge.test");
  await graderPage.goto(`${NORTH}/${mcqId}`);
  await graderPage.getByRole("button", { name: t.actions.submit }).click();
  await expect(graderPage.getByText(en.questionForms.transitionDone.submit)).toBeVisible();
  await grader.close();

  const again = await browser.newContext();
  const adminPage = await asUser(again, "admin@northbridge.test");
  await adminPage.goto(`${NORTH}/${mcqId}`);
  await adminPage.getByRole("button", { name: t.actions.publish }).click();
  await expect(adminPage.getByText(en.questionForms.transitionDone.publish)).toBeVisible();
  await expect(adminPage.getByText(en.questionLabels.statuses.published).first()).toBeVisible();
  await expect(adminPage.getByText(en.questions.history.kinds.status).first()).toBeVisible();
  await again.close();
});

test("grader authors a written question with a rubric; admin publishes it", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await asUser(context, "instructor@northbridge.test");
  await page.goto(`${NORTH}/new?type=written`);
  await page.locator("#q-stem-en").fill(`E2E written ${Date.now()}`);
  await page.locator("#q-marks").fill("5");
  await page.locator("#q-model-en").fill("Model answer");
  await page.locator("#q-criterion-0-en").fill("Key idea");
  await page.locator("#q-criterion-0-marks").fill("3");
  await page.getByRole("button", { name: en.questionForms.addCriterion }).click();
  await page.locator("#q-criterion-1-en").fill("Example");
  await page.locator("#q-criterion-1-marks").fill("1");
  await page.getByRole("button", { name: en.questionForms.saveDraft }).click();
  await expect(page.getByText(en.validation.rubricTotal)).toBeVisible();
  await page.locator("#q-criterion-1-marks").fill("2");
  const id = await saveAndOpen(page, NORTH);
  await page.getByRole("button", { name: en.questionForms.transitions.actions.submit }).click();
  await expect(page.getByText(en.questionForms.transitionDone.submit)).toBeVisible();
  await context.close();

  const admin = await browser.newContext();
  const adminPage = await asUser(admin, "admin@northbridge.test");
  await adminPage.goto(`${NORTH}/${id}`);
  await adminPage.getByRole("button", { name: en.questionForms.transitions.actions.publish }).click();
  await expect(adminPage.getByText(en.questionForms.transitionDone.publish)).toBeVisible();
  await admin.close();
});

test("other organizations and students are denied — UI, routes and direct Supabase access", async ({
  browser,
}) => {
  const apex = await browser.newContext();
  const apexPage = await asUser(apex, "admin@apex.test");
  expect((await apexPage.goto(NORTH))?.status()).toBe(404);
  expect((await apexPage.goto(`${NORTH}/${mcqId}`))?.status()).toBe(404);
  expect((await apexPage.goto("/platform/questions"))?.status()).toBe(403);
  await apex.close();

  const apexClient = await signedInClient("admin@apex.test");
  expect((await apexClient.from("questions").select("id").eq("id", mcqId)).data).toEqual([]);
  expect(
    (await apexClient.from("question_answer_keys").select("question_id").eq("question_id", mcqId)).data,
  ).toEqual([]);

  const student = await browser.newContext();
  const studentPage = await asUser(student, "student@northbridge.test");
  expect((await studentPage.goto(NORTH))?.status()).toBe(403);
  await student.close();

  const studentClient = await signedInClient("student@northbridge.test");
  const visible = await studentClient.from("student_questions").select("id").eq("id", mcqId);
  expect(visible.data).toHaveLength(1); // published content of their own org
  expect((await studentClient.from("question_answer_keys").select("question_id")).data).toEqual([]);
  expect((await studentClient.from("model_answers").select("question_id")).data).toEqual([]);
  expect((await studentClient.from("rubric_criteria").select("id")).data).toEqual([]);
  const drafts = await studentClient.from("questions").select("status").neq("status", "published");
  expect(drafts.data).toEqual([]);
});

test("org admins cannot publish to the public bank; platform admins can", async ({ browser }) => {
  const admin = await browser.newContext();
  const adminPage = await asUser(admin, "admin@northbridge.test");
  expect((await adminPage.goto("/platform/questions/new?type=mcq"))?.status()).toBe(403);
  await admin.close();

  const platform = await browser.newContext();
  const page = await asUser(platform, "superadmin@nextcampus.test");
  await page.goto("/platform/questions/new?type=mcq");
  await fillMcq(page, `E2E public ${Date.now()}`);
  const id = await saveAndOpen(page, "/platform/questions");
  await page.getByRole("button", { name: en.questionForms.transitions.actions.submit }).click();
  await page.getByRole("button", { name: en.questionForms.transitions.actions.publish }).click();
  await expect(page.getByText(en.questionForms.transitionDone.publish)).toBeVisible();
  await platform.close();

  const northClient = await signedInClient("admin@northbridge.test");
  const { error } = await northClient.rpc("transition_question", { p_question_id: id, p_action: "archive" });
  expect(error?.message).toBe("question_not_found");
});

test("CSV import dry run validates rows without saving", async ({ browser }) => {
  // Data-driven: use whatever subject/topic the reference data provides.
  const anon = anonClient();
  const { data: topic } = await anon.from("topics").select("slug, subject_id").limit(1).single();
  const { data: subject } = await anon.from("subjects").select("slug").eq("id", topic!.subject_id).single();
  const header =
    "external_id,type,subject,topic,marks,stem_en,option_a_en,option_b_en,correct_option,explanation_en";
  const rows = [
    `e2e-csv-1,mcq,${subject!.slug},${topic!.slug},1,Imported $1+1$?,1,2,B,Because`,
    `e2e-csv-2,mcq,unknown-subject,${topic!.slug},1,Bad row,1,2,A,x`,
  ];

  const context = await browser.newContext();
  const page = await asUser(context, "instructor@northbridge.test");
  await page.goto(`${NORTH}/import`);
  await page.getByLabel(en.questionImport.file).setInputFiles({
    name: "questions.csv",
    mimeType: "text/csv",
    buffer: Buffer.from([header, ...rows].join("\n")),
  });
  await page.getByRole("button", { name: en.questionImport.submit }).click();
  await expect(page.getByRole("heading", { name: en.questionImport.reportDryRun })).toBeVisible();
  await expect(page.getByText(en.questionImport.outcomes.valid).first()).toBeVisible();
  await expect(page.getByText(en.questionImport.issues.subjectUnknown)).toBeVisible();
  const client = await signedInClient("instructor@northbridge.test");
  expect((await client.from("questions").select("id").eq("import_key", "e2e-csv-1")).data).toEqual([]);
  await context.close();
});

for (const locale of ["bn", "en"] as const) {
  for (const scheme of ["light", "dark"] as const) {
    test(`[${locale}/${scheme}] question bank pages have no serious a11y violations`, async ({ browser }) => {
      const context = await browser.newContext({ colorScheme: scheme, reducedMotion: "reduce" });
      const page = await asUser(context, "admin@northbridge.test", locale);
      for (const path of [
        NORTH,
        `${NORTH}/review`,
        `${NORTH}/new?type=mcq`,
        `${NORTH}/new?type=written`,
        `${NORTH}/import`,
        `${NORTH}/${mcqId}`,
      ]) {
        await page.goto(path);
        await expect(page.locator("html")).toHaveAttribute("lang", locale);
        await expectNoSeriousA11yViolations(page);
      }
      await context.close();
    });
  }
}

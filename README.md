# NextCampus

Admission-test preparation for Bangladesh. Students practise for university admission tests (DU, BUET, RU, CU,
medical, the GST cluster and more) in Bangla or English. The platform is multi-tenant: the main product is the
public practice space that every self-signup student joins, and coaching centers can run their own private
organization alongside it.

What has been built so far:

- **Phase 1**: foundation, identity and multi-tenancy, authentication and access control, and the product shell.
- **Phase 2**: the question bank — MCQ and written questions, authoring and review workflow, CSV import.
- **Phase 1.5**: the public organization, bilingual UI (bn/en), simplified role labels, the admission-market
  redesign, and a database-backed admission catalog that platform admins manage.

Exams, attempts, grading, analytics, leaderboards and payments (bKash) come in later phases.

## Stack and pinned versions

| Package                                 | Version         | Notes                                                      |
| --------------------------------------- | --------------- | ---------------------------------------------------------- |
| next                                    | 16.4.3          | App Router, `proxy.ts`, `forbidden()` via `authInterrupts` |
| react / react-dom                       | 19.3.1          |                                                            |
| typescript                              | 5.9.3           | 6.x/7.x not yet supported by `typescript-eslint`           |
| @supabase/supabase-js                   | 2.118.0         |                                                            |
| @supabase/ssr                           | 0.12.7          | cookie-based sessions (`getAll`/`setAll`)                  |
| supabase (CLI, dev)                     | 2.122.0         | migrations, local stack, type generation                   |
| katex                                   | 0.18.11         | math rendering; 0.16.x has a `trust`-bypass advisory       |
| papaparse                               | 5.5.5           | CSV parsing for question import                            |
| zod                                     | 4.6.7           |                                                            |
| react-hook-form                         | 7.91.0          |                                                            |
| @hookform/resolvers                     | 6.0.2           | supports zod 4                                             |
| tailwindcss / @tailwindcss/postcss      | 4.3.3           | CSS-first config in `src/app/globals.css`                  |
| @radix-ui/react-dialog / -dropdown-menu | 1.3.1 / 2.2.1   | accessible primitives                                      |
| next-themes                             | 0.4.6           | dark mode                                                  |
| eslint / eslint-config-next             | 9.39.5 / 16.4.3 | ESLint 10 not yet supported by `eslint-plugin-react`       |
| vitest                                  | 4.1.12          | unit + database tests                                      |
| @electric-sql/pglite                    | 0.5.13          | in-process PostgreSQL 18 for RLS tests                     |
| @playwright/test / @axe-core/playwright | 1.64.1 / 4.14.0 | E2E + accessibility scans                                  |
| prettier                                | 3.9.10          |                                                            |

All versions are pinned exactly in `package.json`. Node.js ≥ 20.9 is required (CI uses the version in `.nvmrc`).

## Getting started

```bash
npm install
cp .env.example .env.local      # then fill in values (see below)

# Local Supabase (requires Docker)
npm run db:start                # starts Postgres, Auth, Storage, Mailpit
npm run db:reset                # applies supabase/migrations/* and supabase/seed.sql

npm run dev                     # http://localhost:3000
```

`npx supabase status` prints the local API URL and publishable/anon key for `.env.local`. Local emails
(confirmation, password reset) are captured by Mailpit at http://127.0.0.1:54324.

### Environment variables

| Variable                                  | Scope  | Required          | Description                                                                                        |
| ----------------------------------------- | ------ | ----------------- | -------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`                    | public | yes               | Canonical URL; used for auth redirects, emails and metadata                                        |
| `NEXT_PUBLIC_SUPABASE_URL`                | public | yes               | Supabase project URL                                                                               |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`    | public | yes               | Publishable (or legacy anon) key. `NEXT_PUBLIC_SUPABASE_ANON_KEY` is accepted as a fallback        |
| `EMAIL_PROVIDER`                          | server | no                | `console` (default, logs emails) or `resend`                                                       |
| `EMAIL_FROM`                              | server | no                | Sender, e.g. `NextCampus <no-reply@your-domain>`                                                   |
| `RESEND_API_KEY`                          | server | if resend         | Resend API key                                                                                     |
| `CONTACT_NOTIFICATION_EMAIL`              | server | no                | Inbox that receives contact-form submissions                                                       |
| `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` | CLI    | local Google      | Read by `supabase/config.toml`; put it in `supabase/.env` (not `.env.local`)                       |
| `SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET`    | CLI    | local Google      | Read by `supabase/config.toml` for the local stack                                                 |
| `SUPABASE_AUTH_SMTP_PASSWORD`             | CLI    | prod SMTP via CLI | Only if you enable `[auth.email.smtp]` in `config.toml`; hosted projects set SMTP in the dashboard |

The application never uses the Supabase service-role key. `NEXT_PUBLIC_*` values are inlined at build time, so set
them before `npm run build`.

### Email sign-up and verification (OTP)

Sign-up uses Supabase Auth with email confirmation **on**. Supabase generates, stores and checks the codes; the app
never stores them.

1. `/sign-up`: `supabase.auth.signUp`. The confirmation email contains a **6-digit code** (`{{ .Token }}`) and a
   fallback link.
2. `/verify-email`: the user enters the code and the app calls `supabase.auth.verifyOtp({ email, token, type: "email" })`.
   On success Supabase creates the session, and the user continues to onboarding.
3. **Send a new code** calls `supabase.auth.resend({ type: "signup" })`. The button has a 60-second cooldown, matching
   `[auth.email] max_frequency = "60s"`, and Supabase's own rate limit (HTTP 429) is shown as a friendly message.
4. Error handling:
   - Wrong, expired and reused codes all come back from Supabase as `otp_expired` and are shown as one message.
   - Signing in before verifying shows a link to `/verify-email`.
   - Protected pages also refuse unverified accounts on the server.
5. Repeated sign-ups and resends respond the same way whether or not the address has an account.

**Local testing.** The local stack **never delivers email**; every message is captured by **Mailpit** at
**http://127.0.0.1:54324**.

1. Sign up at http://localhost:3000/sign-up.
2. Open Mailpit, open the newest "Confirm your NextCampus account" email and copy the code.
3. Enter it on the verification screen.

Changes to `supabase/config.toml` or `supabase/templates/*` take effect after `npx supabase stop && npx supabase start`.
Plain `stop` keeps your data; never add `--no-backup`, and never run `db reset` against data you need.

**Production SMTP.** Supabase's built-in mailer is for testing only. Real delivery needs your own SMTP provider:

1. Create an SMTP sender with a provider such as Resend, Postmark or SES, and verify your sending domain (SPF/DKIM).
2. In the hosted project, open **Authentication → Emails → SMTP Settings** and enable custom SMTP. Fill in host,
   port, user, password, sender email and sender name. For Resend these are `smtp.resend.com`, `465`, `resend`, and
   your API key as the password.
3. Under **Authentication → Emails → Templates**, paste `supabase/templates/confirmation.html` (Confirm signup) and
   `recovery.html` (Reset password). Keep **Confirm email** enabled.
4. Under **Authentication → URL Configuration**, set Site URL to your domain and add `<SITE_URL>/**` to Redirect URLs.
5. Optionally raise **Authentication → Rate Limits → emails per hour**; this limit applies only with custom SMTP.
6. Sign up with a real inbox to confirm delivery.

For CLI-managed config, `[auth.email.smtp]` in `config.toml` is a commented template that reads the password from
`env(SUPABASE_AUTH_SMTP_PASSWORD)`. Never commit the password.

### Configuring Google sign-in

The button calls `supabase.auth.signInWithOAuth({ provider: "google" })` from a server action.

- Before redirecting, the app checks Supabase's public `/auth/v1/settings`. If Google is disabled, the user stays on
  `/sign-in` with a friendly message instead of Supabase's `Unsupported provider` error.
- Cancelling on Google's consent screen also shows a friendly message.

To enable Google:

1. In **Google Cloud Console**, open APIs & Services, then:
   1. Configure the OAuth consent screen: External, with app name, support email and the authorized domain for
      production.
   2. Create Credentials → **OAuth client ID** → **Web application**.
   3. Under **Authorized redirect URIs**, add `http://127.0.0.1:54321/auth/v1/callback` for local and
      `https://<project-ref>.supabase.co/auth/v1/callback` for hosted.
2. **Local:** create `supabase/.env` (gitignored) containing:
   ```
   SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID=<client id>
   SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET=<client secret>
   ```
   Alternatively, export both variables in the shell that runs the Supabase CLI. The CLI does **not** read
   `.env.local`, which is only for Next.js.
3. Set `enabled = true` under `[auth.external.google]` in `supabase/config.toml`, then run
   `npx supabase stop && npx supabase start`.
4. Check that `curl -s http://127.0.0.1:54321/auth/v1/settings -H "apikey: <anon key>"` reports `"google": true`,
   then click **Continue with Google** at http://localhost:3000/sign-in.
5. **Hosted:** enable Google under **Authentication → Sign In / Providers**, paste the same client ID and secret
   there (never into code), and keep `<SITE_URL>/**` in Redirect URLs.

### Platform administrators

There can be at most **four** platform admins: one **primary** admin plus up to **three additional** admins.

| Capability                                              | Primary | Additional | Org roles |
| ------------------------------------------------------- | ------- | ---------- | --------- |
| `/platform`, `/platform/catalog`, `/platform/questions` | ✓       | ✓          | ✗         |
| View `/platform/admins`                                 | ✓       | ✓ (read)   | ✗         |
| Grant or revoke additional admins                       | ✓       | ✗          | ✗         |
| Be removed or demoted through the app                   | ✗       | ✓          | n/a       |

How it's enforced (`20261101000100_platform_admin_roles.sql`):

- **Four-seat limit:** each admin row holds a `slot` from 1 to 4 that is `UNIQUE`, so a fifth admin is impossible
  even when requests race. `tests/concurrency` proves this with real parallel transactions under READ COMMITTED and
  REPEATABLE READ.
- **Primary seat:** slot 1 is the primary.
- **Who can change it:** `grant_platform_admin(email)` and `revoke_platform_admin(user_id)` check
  `private.is_primary_admin()` in the database. API roles have no write access to the table, so nobody can promote
  themselves.
- **Primary protection:** a trigger blocks deleting or demoting the primary, even with direct SQL, except inside the
  operator-only bootstrap and transfer functions.
- **Organization roles never grant platform access.**

**Bootstrap the primary admin (one time).**

1. Sign up with the intended address (for this phase `rajeshsd304@gmail.com`) and **verify it** with the code. An
   unverified account is refused.
2. As a database operator, run the bootstrap in the SQL editor:
   - local Studio: http://127.0.0.1:54323 → SQL Editor;
   - hosted: Dashboard → SQL Editor;
   - or psql.

   ```sql
   select private.bootstrap_primary_admin('rajeshsd304@gmail.com');
   ```

   It looks up the **confirmed** Supabase Auth account by email, stores its UUID in slot 1, and writes an audit
   entry. The email is only used to find the account; no UUID or email is hard-coded anywhere. The function is
   idempotent, refuses if a different primary already exists, and cannot be called from the app.

3. Sign out and back in, then open http://localhost:3000/platform/admins.

To hand over the primary role later, run `select private.transfer_primary_admin('<confirmed email>');`. The previous
primary becomes an additional admin if a seat is free.

**Additional admins.** The primary admin manages them at `/platform/admins`:

- To add one, enter the email of an existing account with a **verified** email and confirm.
- To remove one, use **Revoke** and confirm.

When all four seats are taken the form explains this; the database enforces it either way. The local seed's
`superadmin@nextcampus.test` (a non-production placeholder) occupies an additional seat until the primary revokes it.

## Database

| Command                | Purpose                                                                       |
| ---------------------- | ----------------------------------------------------------------------------- |
| `npm run db:start`     | Start the local Supabase stack (Docker)                                       |
| `npm run db:reset`     | Recreate the local DB: migrations → `reference-data/catalog.sql` → `seed.sql` |
| `npm run db:push`      | Apply migrations to the linked hosted project (`supabase link` first)         |
| `npm run db:reference` | Load the catalog reference data into `$DATABASE_URL` (idempotent)             |
| `npm run db:types`     | Generate types from the local DB into `src/types/database.generated.ts`       |

Migrations (`supabase/migrations`):

| File                                        | Phase | Purpose                                                                                               |
| ------------------------------------------- | ----- | ----------------------------------------------------------------------------------------------------- |
| `20261029000100_foundation.sql`             | 1     | Enums, tables, constraints, indexes, least-privilege grants                                           |
| `20261029000200_rls.sql`                    | 1     | Authorization helpers (`private` schema), RLS on every table                                          |
| `20261029000300_rpc.sql`                    | 1     | Profile provisioning trigger, audited SECURITY DEFINER RPCs                                           |
| `20261029000400_permissions.sql`            | 1     | Role → permission matrix (reference data)                                                             |
| `20261030000100_public_org.sql`             | 1.5   | `organizations.is_system`, the public org, auto-enrollment, roster RLS tightening                     |
| `20261030000200_locale_preferences.sql`     | 1.5   | `profiles.preferred_locale`, `profiles.preferred_numerals`                                            |
| `20261030000300_catalog.sql`                | 1.5   | Catalog tables, public-read/admin-write RLS, audit triggers, reorder RPC                              |
| `20261030000400_notification_templates.sql` | 1.5   | Translatable notifications (`template` + `params`)                                                    |
| `20261031000100_question_bank.sql`          | 2     | Topics, content settings, question tables, integrity triggers, RLS, student views, storage bucket     |
| `20261031000200_question_rpcs.sql`          | 2     | `save_question`, `transition_question`, assets, duplicates; topics in `move_catalog_item`             |
| `20261101000100_platform_admin_roles.sql`   | 2     | Primary + up to 3 additional platform admins (4 seats), primary-only grant/revoke, operator bootstrap |

Every Phase 1.5 and later migration is additive and has a rollback script in `supabase/rollbacks/<migration>.down.sql`.
Run the rollbacks in reverse order, then delete the matching rows from `supabase_migrations.schema_migrations`.
`tests/db/migrations.test.ts` checks that the migrations apply on top of a Phase 1 database and a Phase 1.5
database that already hold data, and that up → down → up works.

### The public organization (B2C)

- **The org itself:** "NextCampus Public" (slug `public`) is a system organization (`organizations.is_system`)
  created by migration in every environment.
- **Protection:** triggers stop anyone from renaming it, changing its slug, suspending it or deleting it, the
  table owner included. Members cannot leave it, and the slug `public` is reserved.
- **Automatic enrollment:** the profile-provisioning trigger enrolls every new auth user as a `student` and
  records `member.auto_enrolled` in the audit log. Enrollment is idempotent.
- **Invited users:** anyone who signs up while holding a pending invitation is left to the inviting
  organization. They can opt in later with `public.join_public_organization()` (audited as
  `member.joined_public`).
- **Privacy:** inside a system org, `members.read` does not grant roster or profile visibility.
  `private.can_read_roster()` requires `members.manage` there, so students, and future graders, see only their
  own membership and profile. `tests/db/public-org.test.ts` covers this.
- **Multiple workspaces:** a user can belong to the public org and to any number of coaching-center orgs. The org
  switcher lists public practice first. With no last-used workspace, `/dashboard` prefers the institution
  workspace.
- **Coaching centers:** "Join or create a workspace" (`/onboarding/organization`) still offers organization
  creation, but students never have to go through it.

### Admission catalog

| Table                   | Notes                                                                                            |
| ----------------------- | ------------------------------------------------------------------------------------------------ |
| `university_categories` | Lookup table (key + bn/en names). Adding a category needs no code change.                        |
| `universities`          | `slug`, `name_en`, `name_bn`, `short_code`, `category_key`, `website`, `is_active`, `sort_order` |
| `subjects`              | Bilingual reference list                                                                         |
| `exam_targets`          | Per-university admission units: bn/en names, descriptions and format notes, `negative_marking`   |
| `exam_target_subjects`  | Many-to-many link between exam targets and subjects                                              |

- **Read access:** `anon` and `authenticated` see active rows only. Visibility cascades: an inactive category
  hides its universities, and an inactive university hides its exam targets.
- **Write access:** platform admins only, enforced by RLS. Column grants keep `created_at`/`updated_at`
  server-assigned.
- **Audit:** every insert, update and delete is audited by trigger, e.g. `university.created`,
  `university.deactivated`, `exam_target.reordered`.
- **Deletion:** a row that is still referenced cannot be deleted (foreign key `RESTRICT`); deactivate it instead.
- **Data-driven app:** the public catalog (`/exams`, `/exams/[university]`), its filters, the homepage university
  strip and `sitemap.xml` all read from the database through an anonymous client. No university name, slug or
  count appears in application code or tests.

**Reference data.** `supabase/reference-data/catalog.sql` holds the starter list of categories, universities,
subjects and exam targets. It only inserts rows that are missing, so it is safe in any environment and never
overwrites edits made in the UI. It loads automatically on `db:reset`. In production, load it once with
`DATABASE_URL=… npm run db:reference`. Format notes in it are deliberately general: verify them against official
circulars before launch.

**How a platform admin adds a university:**

1. Go to `/platform/catalog`, then **Add university**.
2. Fill in the Bangla and English names, the slug (used in `/exams/<slug>`), the short code and the category,
   then save.
3. Add at least one exam target for it (**Add exam target**). The public catalog lists universities that have
   targets.
4. It appears immediately on `/exams`, in the filters, in the homepage strip and in `sitemap.xml`, in both
   languages.
5. **Deactivate** hides it everywhere without deleting anything, and **Activate** brings it back. Every change
   is in the audit log shown on the same page.

### Seeded non-production accounts

`supabase/seed.sql` runs only on `supabase db reset` (local). **Never run it against production.**
Password for every account: `NextCampus-Dev-2026!`

| Email                         | Role                                                          |
| ----------------------------- | ------------------------------------------------------------- |
| `superadmin@nextcampus.test`  | Platform Admin (`/platform`, `/platform/catalog`)             |
| `admin@northbridge.test`      | Organization Admin, Northbridge University                    |
| `instructor@northbridge.test` | Instructor/Grader (instructor), Northbridge University        |
| `reviewer@northbridge.test`   | Instructor/Grader (invigilator), Northbridge University       |
| `student@northbridge.test`    | Student, Northbridge University                               |
| `admin@apex.test`             | Organization Admin, Apex Coaching Centre (second tenant)      |
| `newuser@nextcampus.test`     | Profile incomplete; pending student invitation to Northbridge |
| `learner@nextcampus.test`     | Student, NextCampus Public                                    |
| `learner2@nextcampus.test`    | Student, NextCampus Public (for privacy checks)               |
| `dual@nextcampus.test`        | Student in NextCampus Public **and** Apex Coaching Centre     |

Phase 1 seed accounts keep their Phase 1 memberships: the seed removes the public enrollment the trigger adds for
them. Newcomer invitation link:
`http://localhost:3000/invite/5eed5eed5eed5eed5eed5eed5eed5eed5eed5eed5eed5eed5eed5eed5eed5eed`

## Question bank (Phase 2)

### Content model

| Table                        | Holds                                                                      | Who can read                                                      |
| ---------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `questions`                  | Type, status, difficulty, subject/topic/exam target, bilingual stem, marks | Owner-org authors/reviewers; owner-org members once published     |
| `question_options`           | MCQ options A–F, bilingual text (**no correctness flag**)                  | Same as the question                                              |
| `question_answer_keys`       | The single correct option + bilingual explanation                          | Owner-org authors/reviewers, platform admins — **never students** |
| `written_question_specs`     | Answer mode (text / image / both), word and character limits               | Same as the question                                              |
| `model_answers`              | Bilingual model answer                                                     | Authors/reviewers only — never students                           |
| `rubrics`, `rubric_criteria` | Marking guidance and criteria (bilingual text, max marks)                  | Authors/reviewers only — never students                           |
| `question_assets`            | Images in the private `question-assets` bucket                             | Same as the question                                              |
| `question_revisions`         | Immutable snapshot of everything above on every edit or status change      | Authors/reviewers only                                            |
| `topics`                     | Per-subject topics (optionally nested), public reference data              | Everyone (active rows)                                            |
| `content_settings`           | Configurable language rules                                                | Signed-in users; platform admins edit                             |

**Ownership.** Every question has an `owner_org_id`. Questions owned by the system organization form the
**public bank**. All other questions are private to their organization and are never readable outside it. This
is tested for every table, the student views, Storage and every RPC.

**Answer data is separate from content (Phase 3 contract).**

- Correctness lives only in `question_answer_keys`: one row per MCQ, pointing at one of that question's own
  options, so "exactly one correct option" is enforced by the structure itself.
- Written model answers and rubrics live in their own tables.
- Students read published content through three views that contain no answer data at all:

| View                       | Columns                                                                                                         |
| -------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `student_questions`        | id, owner_org_id, type, difficulty, exam_target_id, subject_id, topic_id, stem_bn, stem_en, marks, published_at |
| `student_question_options` | id, question_id, label, text_bn, text_en, sort_order                                                            |
| `student_written_specs`    | question_id, answer_mode, word_limit, char_limit                                                                |

The views are `security_invoker`, so the underlying RLS still applies: published questions only, own organization
only. The Phase 3 exam player must:

- read questions only through these views, or through narrower exam-scoped functions;
- reveal explanations and model answers through server-side functions after an attempt.

It must never select the answer tables as a student; RLS refuses that anyway.

**Integrity enforced in the database.** These rules use deferred constraint triggers, checked at commit, so they
hold even for direct SQL:

- An MCQ has 2–6 options labelled A–F in order, and exactly one answer key that references one of its own options.
- A written question has a spec. When rubric criteria exist, their marks sum exactly to the question's marks. At
  least one criterion is required once the question leaves draft.
- A topic belongs to the question's subject, and a question's type and owner never change.
- Revisions and audit entries are append-only.

### Workflow

Status changes only through `transition_question`. It applies the state machine below, writes a revision and an
audit entry, and uses the database clock:

| Action   | From        | To          | Who                                                                        |
| -------- | ----------- | ----------- | -------------------------------------------------------------------------- |
| submit   | `draft`     | `in_review` | Editors of the draft (see below); language rule `review`                   |
| withdraw | `in_review` | `draft`     | The creator or a reviewer                                                  |
| reject   | `in_review` | `draft`     | Reviewer; **reason required** (stored in the revision, sent to the author) |
| publish  | `in_review` | `published` | Reviewer; language rule `org_publish` / `public_publish`                   |
| archive  | `published` | `archived`  | Reviewer; optional reason                                                  |
| restore  | `archived`  | `draft`     | Reviewer                                                                   |

- **Authors:** Instructor/Grader (instructor, invigilator) and Organization Admin, via `questions.author`.
  Instructors/Graders edit only their **own** drafts; org admins can edit any draft in their organization.
- **Reviewers:** Organization Admin (`questions.review`) reviews organization-private questions. For the **public
  bank, only Platform Admins** can review and publish. Even an org admin appointed inside the public organization
  cannot.
- **Edits:** content can be edited only in `draft`. Every content write goes through `save_question`, which saves
  all parts in one transaction. API roles have no INSERT/UPDATE/DELETE on any content table.

**Language rules.** These live in `content_settings`. A value of `1` means at least one language is complete; `2`
means both:

| Key                                     | Default | Applies to                        |
| --------------------------------------- | ------- | --------------------------------- |
| `question_review_min_languages`         | `1`     | submitting for review             |
| `question_org_publish_min_languages`    | `1`     | publishing organization questions |
| `question_public_publish_min_languages` | `2`     | publishing to the public bank     |

A language counts as complete when all of these are filled in that language:

- the stem;
- every option (MCQ) or every rubric criterion (written);
- the explanation (MCQ) or the model answer (written).

Platform admins change a rule with
`update content_settings set value = '2' where key = 'question_review_min_languages';`. The change is audited.

**Duplicates.** Stems are normalized (Unicode NFKC, lower-cased, punctuation and whitespace collapsed) and hashed
per language. A matching stem in the same organization, or in the published public bank, produces a **warning** with
links when you save or import. It never blocks the save.

**Images.**

- Files go straight from the browser to the private `question-assets` bucket through a one-time signed upload URL.
- The path is `<owner_org_id>/<question_id>/<uuid>.<ext>`. The bucket accepts PNG, JPEG and WebP up to 2 MB.
- Storage RLS allows uploads only to drafts the user may edit, and reads only to people who can read the question.
- Images are served through short-lived signed URLs.

### Content and math rendering

- **Syntax:** question text is **plain text**, with math between `$…$` (inline) or `$$…$$` (display). `\$` is a
  literal dollar sign.
- **Text:** rendered as escaped React text, so any HTML in content is shown literally and never interpreted.
- **Math:** rendered by KaTeX with `trust: false` (no links, images or raw-HTML commands) and with size and expansion
  limits. It renders server-side on the list, detail and review pages, and live in the editor preview.
- **Tests:** `tests/unit/question-render.test.ts` runs malicious payloads through the renderer: script tags, event
  handlers, `javascript:` links, `\href`, `\url`, `\htmlId`, `\includegraphics` and expansion bombs.

### CSV import

Import lives at `/o/<org>/questions/import`, and at `/platform/questions/import` for the public bank. The template
is `public/templates/question-import-template.csv`: UTF-8, a header row, and one MCQ and one written example.

**Columns:**

- **Every row:** one row per question. `type` is `mcq` or `written`. `subject`, `topic` and `exam_target` are
  catalog **slugs**. `external_id` is your own stable id for the row.
- **MCQ:** `option_a_bn` … `option_f_en` (2–6 options), `correct_option` (A–F), and `explanation_bn/en`.
- **Written:** `answer_mode`, `word_limit`, `char_limit`, `model_answer_bn/en`, and up to six criteria
  (`criterion_N_bn`, `criterion_N_en`, `criterion_N_marks`) whose marks add up to `marks`.

**Behavior:**

- **Dry run** (the default): validates every row with the same Zod schema as the editor, resolves slugs and reports
  duplicates. Nothing is written.
- **Idempotent re-import:** rows are matched by `(organization, external_id)`.
  - Existing drafts are updated. If nothing changed, no new revision is written and the row is reported as
    "unchanged".
  - Questions that are no longer drafts are skipped.
  - New rows become drafts.
- **Limits:** 1 MB and 500 rows per file.
- **Report:** every row gets its own result: created, updated, unchanged, skipped, or error with the column and
  reason.

### Routes

| Route                                                                            | Who                                                             |
| -------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `/o/<org>/questions`                                                             | Instructor/Grader, Org Admin (list, filters, cursor pagination) |
| `/o/<org>/questions/new?type=mcq` or `written`, `/[id]`, `/[id]/edit`, `/import` | Authors                                                         |
| `/o/<org>/questions/review`                                                      | Org Admin (review queue)                                        |
| `/platform/questions/…`                                                          | Platform Admin (public bank, same screens)                      |
| `/platform/catalog` → Topics                                                     | Platform Admin (manage topics)                                  |

The seed adds sample questions through the real RPCs:

- an MCQ draft and a written question in review at Northbridge;
- a published bilingual MCQ in the public bank.

## Internationalization (bn / en)

- **Library and locales:** next-intl 4 without URL prefixes, so every existing route still works. Locales are
  `bn` (the default) and `en`, configured in `src/i18n/config.ts`.
- **How the locale is chosen:**
  1. the `NEXT_LOCALE` cookie;
  2. otherwise `bn`.

  When someone signs in, `profiles.preferred_locale` is copied into the cookie. If the profile has no preference
  yet, the cookie's value is saved to the profile.

- **Language switcher:** it sits in the header, the footer, the auth pages and the app shell. It is a plain
  `<form>` that posts to a Server Action, so it works without JavaScript and updates both the cookie and the
  profile.
- **Digits:** `profiles.preferred_numerals` (Settings → Language and numbers) chooses Bangla digits (১২৩) or
  English digits (123). Bangla defaults to Bangla digits.
- **Formatting:** `src/lib/i18n-format.ts` formats dates in the viewer's time zone (`Asia/Dhaka` for visitors),
  numbers, and Taka with ৳ using the active locale and digits.
- **Fonts:** Hind Siliguri (Bengali + Latin) through `next/font`, alongside Inter and Plus Jakarta Sans. Under
  `html:lang(bn)`, Tailwind's line-height and tracking variables are raised, so Bengali vowel signs never clip.
- **Messages:** `messages/en.json` and `messages/bn.json` are typed. A wrong key is a type error. Only the
  namespaces in `CLIENT_NAMESPACES` are sent to the browser.
- **Message keys as data:** Zod schemas, server actions and database error codes return message keys
  (`validation.*`, `errors.*`, …), and the UI translates them.
- **Notifications:** notifications store a `template` key and `params`, so they render in the reader's
  language.
- **Enforcement:**
  - ESLint `react/jsx-no-literals` fails the build on hard-coded JSX text.
  - `tests/unit/i18n.test.ts` fails when:
    - a key, placeholder or rich-text tag exists in one locale but not the other;
    - a message is empty;
    - a database error code or validation key has no translation.

**Adding a translation:** add the key to both `messages/en.json` and `messages/bn.json` (the tests require
both), then use it with `getTranslations("namespace")` in Server Components or `useTranslations("namespace")` in
Client Components. If a Client Component needs a new namespace, add it to `CLIENT_NAMESPACES` in
`src/i18n/messages.ts`.

**Adding a locale:**

1. Add it to `LOCALES`, `INTL_LOCALE` and `LOCALE_NATIVE_NAMES` in `src/i18n/config.ts`.
2. Create `messages/<locale>.json` with every key.
3. Add it to the `catalogs` map in `tests/unit/i18n.test.ts`.
4. Add `name_<locale>` columns to the catalog tables if catalog data should be translated too.

The database accepts any `xx` / `xx-YY` value in `preferred_locale`, so no migration is needed for the profile
preference.

### Roles in the UI

The underlying roles, the permission matrix and RLS are unchanged. The UI shows four labels, defined in
`src/features/access/roles.ts`, with their text in `messages/*.json` under `roles.*`:

| UI label           | Database role(s)            |
| ------------------ | --------------------------- |
| Student            | `student`                   |
| Instructor/Grader  | `instructor`, `invigilator` |
| Organization Admin | `org_admin`                 |
| Platform Admin     | `platform_admins` row       |

When an admin invites someone as or changes someone to "Instructor/Grader", an existing instructor or
invigilator keeps their current underlying role, and anyone else becomes `instructor`.

## Quality checks

```bash
npm run lint          # ESLint (next/core-web-vitals, typescript, jsx-a11y, react-hooks)
npm run typecheck     # next typegen + tsc --noEmit (strict)
npm run format:check  # Prettier
npm test              # Vitest: unit, i18n-parity and database/RLS/migration tests (PGlite, no Docker needed)
npm run build
npm run test:e2e      # Playwright (desktop + mobile); build first with the same NEXT_PUBLIC_* env
E2E_SUPABASE=1 npm run test:e2e   # also runs full-stack flows against the seeded local Supabase

# Real-concurrency test for the 4-admin limit (disposable Postgres only):
docker run --rm -d --name nc-concurrency -e POSTGRES_PASSWORD=test -p 55432:5432 postgres:17
CONCURRENCY_DATABASE_URL=postgres://postgres:test@127.0.0.1:55432/postgres npx vitest run tests/concurrency
docker rm -f nc-concurrency
```

The database tests (`tests/db`) boot an in-memory PostgreSQL (PGlite), load a small emulation of the Supabase
platform objects (`tests/db/supabase-shim.sql`: `anon`/`authenticated` roles, `auth.uid()`, `auth.users`,
Supabase's default grants), then apply the **real** migrations and seed. Each test runs as an API role inside a
rolled-back transaction, exactly as PostgREST would.

## Architecture

```
messages/                 en.json, bn.json — every UI string (typed; parity-tested)
src/
  app/                    routes only: thin pages that compose features
    (marketing)/          public site: home, exams (DB catalog), features, pricing, faq, contact, legal
    (auth)/               sign-in, sign-up, password reset, email confirmation
    (app)/                authenticated shell: dashboard router, /o/[orgSlug]/…, settings, notifications,
                          platform (console + catalog management)
    auth/callback|confirm route handlers for OAuth PKCE and email token-hash verification
    onboarding/, invite/[token]/
  features/<feature>/     schemas.ts (zod), actions.ts ("use server"), server/ (queries, guards), components/
    access/               roles, UI role labels, permission matrix (mirrors the DB)
    auth/ profiles/ organizations/ invitations/ notifications/ audit/ contact/ billing/
    catalog/              admission catalog: public queries, admin actions/forms
    questions/            question bank: schemas, safe math renderer, CSV import, queries, actions, editor, pages
    preferences/          locale + digit preferences (cookie ↔ profile)
    marketing/ dashboards/
  i18n/                   next-intl config, request resolution, message typing
  components/ui/          accessible primitives (Button, FormField, Dialog, DropdownMenu, …)
  components/layout/      site header/footer, theme toggle, language switcher, logo
  components/app-shell/   authenticated header, org switcher, user menu, side nav
  lib/                    env, Supabase clients (server, proxy, anonymous public), errors, ActionResult,
                          safe redirects, email provider, i18n formatting
  types/database.ts       Supabase types (generated format)
  proxy.ts                session refresh + optimistic redirects
supabase/                 config.toml, migrations/, rollbacks/, reference-data/, seed.sql, email templates
public/templates/         question-import-template.csv
tests/unit, tests/db, e2e/
```

### Authorization model (defense in depth)

1. **`proxy.ts`** refreshes the session and redirects signed-out visitors away from protected routes. This is
   optimistic only and is never relied on for security.
2. **Server guards** (`requireViewer`, `requireOrgArea`, `requireOrgPermission`, `requireSuperAdmin`) run in every
   protected page. The user comes from `supabase.auth.getUser()`, which is verified with Supabase Auth.
   Non-members get **404** (tenant existence is not revealed), and members without the permission get **403**
   (`forbidden()`).
3. **Server actions** validate every input with Zod and act as the signed-in user. They never use a service
   role.
4. **PostgreSQL** is the final authority:
   - RLS on every table. Policies call `private.has_org_permission(org, permission)`, which is backed by
     `role_permissions`.
   - Deny-by-default grants. `anon` has no table access. Column-level grants limit what users may update, and
     `invitations.token_hash` is unreadable.
   - Membership, invitation and tenancy changes are only possible through `SECURITY DEFINER` RPCs. These derive
     the actor from `auth.uid()`, authorize, validate, protect the last administrator, and write audit entries
     with `now()` timestamps.
   - `audit_logs` is append-only, enforced by a trigger even for the table owner.

Roles are per organization (`org_admin`, `instructor`, `invigilator`, `student`). Super Administrator is a
platform role (`platform_admins`) that can only be granted with direct SQL or the service role.

### Invitations

Invitation tokens are 256-bit random values from two `gen_random_uuid()` calls, and only their SHA-256 hash is
stored. An invitation is bound to an email address: acceptance requires the caller's **verified** auth email to
match. Invitations are single-use and expire after 7 days, and a new invitation for the same address supersedes
the old one. The raw link is emailed through the provider abstraction and also shown once to the inviting admin.

### Provider abstractions

- **Email** (`src/lib/email`): an `EmailProvider` interface with `ConsoleEmailProvider` (development) and
  `ResendEmailProvider` (HTTP API, no SDK). Select one with `EMAIL_PROVIDER`.
- **Payments** (`src/features/billing`): a `PaymentProvider` contract and plan catalog.
  `getPaymentProvider()` returns `null` until a provider is implemented, and the UI does not offer checkout.

## Known limitations

- **Not built yet:** exams, attempts, grading, analytics, leaderboards and payments are not part of Phases 1–2. Dashboards,
  pricing and the catalog say "coming soon" where those features will go. The site shows no fake statistics,
  testimonials or prices.
- **One indexable language:** the locale lives in a cookie, not the URL, so search engines index only the
  default (Bangla) version. Language-prefixed URLs with `hreflang` would be needed for bilingual SEO.
- **Dynamic pages:** marketing pages now render per request, because they read the locale cookie and the catalog.
  They ship no extra client JavaScript.
- **Share image:** the Open Graph image is in English, because the image renderer has no Bengali font loaded.
- **Reference data needs checking:** university websites, unit groupings and format notes are starter data and
  must be checked against official circulars. Platform admins can correct them in the UI.
- **Database types:** `src/types/database.ts` is maintained by hand in the generated format. Run
  `npm run db:types` against a running stack and reconcile.
- **Phase 1 notifications stay English:** notifications created before the template migration have no template
  and keep their English text.
- **Sign-in audit source:** sign-in audit events are recorded by the app. Supabase's auth audit log remains the
  authoritative record.
- **Legal copy:** the legal pages, in both languages, need review by counsel before launch.
- **Who can read published questions:** students can read _published_ questions of organizations they belong to,
  through the student views. Phase 3 may narrow this to exam-scoped access.
- **Hidden answer data:** rubrics and model answers are never shown to students yet.
- **No deletion:** questions cannot be deleted; archive them instead. Removed images stay in Storage until they are
  cleaned up through the Storage API.
- **Gated end-to-end coverage:** signed-URL uploads, in-browser KaTeX rendering and all question flows are covered by
  the gated E2E suite (`E2E_SUPABASE=1`), which needs a running Supabase stack.

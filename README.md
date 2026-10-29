# NextCampus

Secure, trusted, modern digital assessments. NextCampus is a multi-tenant online examination platform for
universities, coaching centers, training organizations and independent instructors.

This repository contains **Phase 1**: foundation, identity and multi-tenancy, authentication and access control,
and the product shell (public site plus role-aware dashboards).

## Stack and pinned versions

| Package                                 | Version         | Notes                                                      |
| --------------------------------------- | --------------- | ---------------------------------------------------------- |
| next                                    | 16.4.3          | App Router, `proxy.ts`, `forbidden()` via `authInterrupts` |
| react / react-dom                       | 19.3.1          |                                                            |
| typescript                              | 5.9.3           | 6.x/7.x not yet supported by `typescript-eslint`           |
| @supabase/supabase-js                   | 2.118.0         |                                                            |
| @supabase/ssr                           | 0.12.7          | cookie-based sessions (`getAll`/`setAll`)                  |
| supabase (CLI, dev)                     | 2.122.0         | migrations, local stack, type generation                   |
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

| Variable                                  | Scope  | Required     | Description                                                                                 |
| ----------------------------------------- | ------ | ------------ | ------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`                    | public | yes          | Canonical URL; used for auth redirects, emails and metadata                                 |
| `NEXT_PUBLIC_SUPABASE_URL`                | public | yes          | Supabase project URL                                                                        |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`    | public | yes          | Publishable (or legacy anon) key. `NEXT_PUBLIC_SUPABASE_ANON_KEY` is accepted as a fallback |
| `EMAIL_PROVIDER`                          | server | no           | `console` (default, logs emails) or `resend`                                                |
| `EMAIL_FROM`                              | server | no           | Sender, e.g. `NextCampus <no-reply@your-domain>`                                            |
| `RESEND_API_KEY`                          | server | if resend    | Resend API key                                                                              |
| `CONTACT_NOTIFICATION_EMAIL`              | server | no           | Inbox that receives contact-form submissions                                                |
| `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` | CLI    | local Google | Read by `supabase/config.toml` for the local stack                                          |
| `SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET`    | CLI    | local Google | Read by `supabase/config.toml` for the local stack                                          |

The application never uses the Supabase service-role key. `NEXT_PUBLIC_*` values are inlined at build time, so set
them before `npm run build`.

### Configuring Google sign-in

1. Create an OAuth client (type "Web application") in Google Cloud Console.
2. Authorized redirect URI: `<SUPABASE_URL>/auth/v1/callback` (local: `http://127.0.0.1:54321/auth/v1/callback`).
3. Local: export the two `SUPABASE_AUTH_EXTERNAL_GOOGLE_*` variables, set `enabled = true` under
   `[auth.external.google]` in `supabase/config.toml`, then `npm run db:start`.
   Hosted: enable Google under Authentication → Providers.
4. Set Authentication → URL Configuration → Site URL to `<SITE_URL>` and add `<SITE_URL>/**` to Redirect URLs
   (OAuth callbacks include a `?next=` query and confirmation links redirect to the post-verification path).

### Hosted Supabase email templates

The app verifies email links server-side at `/auth/confirm` (token-hash flow, works across devices). The local
stack uses `supabase/templates/*.html` automatically. For a hosted project, paste those templates into
Authentication → Email Templates (Confirm signup and Reset password) and enable "Confirm email".

## Database

| Command            | Purpose                                                                 |
| ------------------ | ----------------------------------------------------------------------- |
| `npm run db:start` | Start the local Supabase stack (Docker)                                 |
| `npm run db:reset` | Recreate the local DB: all migrations, then `supabase/seed.sql`         |
| `npm run db:push`  | Apply migrations to the linked hosted project (`supabase link` first)   |
| `npm run db:types` | Generate types from the local DB into `src/types/database.generated.ts` |

Migrations (`supabase/migrations`):

1. `20261029000100_foundation.sql`: enums, tables, constraints, indexes and least-privilege grants
2. `20261029000200_rls.sql`: authorization helpers (`private` schema) and RLS policies on every table
3. `20261029000300_rpc.sql`: profile provisioning trigger, audited SECURITY DEFINER RPCs
4. `20261029000400_permissions.sql`: role → permission matrix (reference data for every environment)

### Seeded non-production accounts

`supabase/seed.sql` runs only on `supabase db reset` (local). **Never run it against production.**
Password for every account: `NextCampus-Dev-2026!`

| Email                         | Role                                                          |
| ----------------------------- | ------------------------------------------------------------- |
| `superadmin@nextcampus.test`  | Super Administrator (platform console)                        |
| `admin@northbridge.test`      | Organization Admin, Northbridge University                    |
| `instructor@northbridge.test` | Instructor, Northbridge University                            |
| `reviewer@northbridge.test`   | Invigilator/Reviewer, Northbridge University                  |
| `student@northbridge.test`    | Student, Northbridge University                               |
| `admin@apex.test`             | Organization Admin, Apex Coaching Centre (second tenant)      |
| `newuser@nextcampus.test`     | Profile incomplete; pending student invitation to Northbridge |

Newcomer invitation link: `http://localhost:3000/invite/5eed5eed5eed5eed5eed5eed5eed5eed5eed5eed5eed5eed5eed5eed5eed5eed`

## Quality checks

```bash
npm run lint          # ESLint (next/core-web-vitals, typescript, jsx-a11y, react-hooks)
npm run typecheck     # next typegen + tsc --noEmit (strict)
npm run format:check  # Prettier
npm test              # Vitest: unit tests + database/RLS tests (PGlite, no Docker needed)
npm run build
npm run test:e2e      # Playwright (desktop + mobile); build first with the same NEXT_PUBLIC_* env
E2E_SUPABASE=1 npm run test:e2e   # also runs full-stack flows against the seeded local Supabase
```

The database tests (`tests/db`) boot an in-memory PostgreSQL (PGlite), load a small emulation of the Supabase
platform objects (`tests/db/supabase-shim.sql`: `anon`/`authenticated` roles, `auth.uid()`, `auth.users`,
Supabase's default grants), then apply the **real** migrations and seed. Each test runs as an API role inside a
rolled-back transaction, exactly as PostgREST would.

## Architecture

```
src/
  app/                    routes only: thin pages that compose features
    (marketing)/          public site (static)
    (auth)/               sign-in, sign-up, password reset, email confirmation
    (app)/                authenticated shell: dashboard router, /o/[orgSlug]/…, settings, notifications, platform
    auth/callback|confirm route handlers for OAuth PKCE and email token-hash verification
    onboarding/, invite/[token]/
  features/<feature>/     schemas.ts (zod), actions.ts ("use server"), server/ (queries, guards), components/
    access/               roles and permission matrix (mirrors the DB)
    auth/  profiles/  organizations/  invitations/  notifications/  audit/  contact/  billing/  marketing/  dashboards/
  components/ui/          accessible primitives (Button, FormField, Dialog, DropdownMenu, …)
  components/layout/      site header/footer, theme, logo
  components/app-shell/   authenticated header, org switcher, user menu, side nav
  lib/                    env validation, Supabase clients, errors, ActionResult, safe redirects, email provider
  types/database.ts       Supabase types (generated format)
  proxy.ts                session refresh + optimistic redirects
supabase/                 config.toml, migrations, seed.sql, email templates
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

## Known limitations (Phase 1)

- Assessment authoring, delivery, proctoring and results are Phase 2. Dashboards show live identity and
  organization data, with honest empty states where exam data will appear. The public exam catalog describes
  assessment formats; it does not list live exams.
- `src/types/database.ts` is hand-maintained in the generated format, because no database was available when
  it was written. Run `npm run db:types` against a running stack and reconcile.
- Sign-in audit events are recorded by the app after a successful sign-in, through a throttled RPC that is
  limited to the caller's own account. Supabase's built-in auth audit log remains the authoritative source.
- Billing has no live provider.
- Legal page copy is a reasonable baseline and should be reviewed by counsel before launch.
- Rate limiting relies on Supabase Auth limits plus per-RPC throttles. Consider an edge rate limiter for the
  contact form in production.

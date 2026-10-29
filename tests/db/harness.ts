import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { PGlite, type Transaction } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";

const root = path.resolve(import.meta.dirname, "../..");

export const SEED = {
  password: "NextCampus-Dev-2026!",
  users: {
    superAdmin: { id: "00000000-0000-4000-8000-000000000001", email: "superadmin@nextcampus.test" },
    northAdmin: { id: "00000000-0000-4000-8000-000000000002", email: "admin@northbridge.test" },
    northInstructor: { id: "00000000-0000-4000-8000-000000000003", email: "instructor@northbridge.test" },
    northStudent: { id: "00000000-0000-4000-8000-000000000004", email: "student@northbridge.test" },
    northReviewer: { id: "00000000-0000-4000-8000-000000000005", email: "reviewer@northbridge.test" },
    apexAdmin: { id: "00000000-0000-4000-8000-000000000006", email: "admin@apex.test" },
    newcomer: { id: "00000000-0000-4000-8000-000000000007", email: "newuser@nextcampus.test" },
  },
  orgs: {
    northbridge: "10000000-0000-4000-8000-000000000001",
    apex: "10000000-0000-4000-8000-000000000002",
  },
  newcomerInviteToken: "5eed".repeat(16),
} as const;

export type SeedUser = (typeof SEED.users)[keyof typeof SEED.users];

/** Boots an in-memory Postgres with the Supabase shim, every migration and the seed. */
export async function createTestDatabase(options: { seed?: boolean } = {}): Promise<PGlite> {
  const db = new PGlite({ extensions: { pgcrypto } });
  await db.exec(readFileSync(path.join(root, "tests/db/supabase-shim.sql"), "utf8"));

  const migrationsDir = path.join(root, "supabase/migrations");
  const migrations = readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort();
  for (const file of migrations) {
    try {
      await db.exec(readFileSync(path.join(migrationsDir, file), "utf8"));
    } catch (error) {
      throw new Error(`Migration ${file} failed: ${(error as Error).message}`);
    }
  }

  if (options.seed !== false) {
    await db.exec(readFileSync(path.join(root, "supabase/seed.sql"), "utf8"));
  }
  return db;
}

type Actor = { id: string; email: string } | "anon";

/**
 * Runs `fn` inside a transaction as an API role, exactly as PostgREST would:
 * `SET LOCAL ROLE` plus request.jwt.claims. The transaction is rolled back
 * unless `commit` is true so tests stay independent.
 */
export async function as<T>(
  db: PGlite,
  actor: Actor,
  fn: (tx: Transaction) => Promise<T>,
  { commit = false }: { commit?: boolean } = {},
): Promise<T> {
  let result: T | undefined;
  const rollback = new Error("__rollback__");
  try {
    await db.transaction(async (tx) => {
      if (actor === "anon") {
        await tx.query(`select set_config('request.jwt.claims', $1, true)`, [
          JSON.stringify({ role: "anon" }),
        ]);
        await tx.exec("set local role anon");
      } else {
        await tx.query(`select set_config('request.jwt.claims', $1, true)`, [
          JSON.stringify({ sub: actor.id, email: actor.email, role: "authenticated" }),
        ]);
        await tx.exec("set local role authenticated");
      }
      result = await fn(tx);
      if (!commit) throw rollback;
    });
  } catch (error) {
    if (error !== rollback) throw error;
  }
  return result as T;
}

/** Inserts a brand-new auth user (fires the profile trigger) and returns it. */
export async function createAuthUser(
  db: PGlite,
  input: { id: string; email: string; fullName?: string; confirmed?: boolean },
): Promise<{ id: string; email: string }> {
  await db.query(
    `insert into auth.users (id, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, aud, role)
     values ($1, $2, $3, '{"provider":"google"}', $4, 'authenticated', 'authenticated')`,
    [
      input.id,
      input.email,
      input.confirmed === false ? null : new Date().toISOString(),
      JSON.stringify(input.fullName ? { full_name: input.fullName } : {}),
    ],
  );
  return { id: input.id, email: input.email };
}

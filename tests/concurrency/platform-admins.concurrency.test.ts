import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * Real concurrency test for the four-admin limit. Needs a DISPOSABLE Postgres
 * (never a real project database), e.g.
 *   docker run --rm -d --name nc-concurrency -e POSTGRES_PASSWORD=test -p 55432:5432 postgres:17
 *   CONCURRENCY_DATABASE_URL=postgres://postgres:test@127.0.0.1:55432/postgres npx vitest run tests/concurrency
 * The Supabase shim and every migration are applied to it.
 */
const url = process.env.CONCURRENCY_DATABASE_URL;
const root = path.resolve(import.meta.dirname, "../..");

const PRIMARY = { id: "90000000-0000-4000-8000-000000000001", email: "primary@race.test" };
const CANDIDATES = Array.from({ length: 8 }, (_, i) => ({
  id: `90000000-0000-4000-8000-0000000001${String(i).padStart(2, "0")}`,
  email: `candidate-${i}@race.test`,
}));

async function connect(): Promise<Client> {
  const client = new Client({ connectionString: url });
  await client.connect();
  return client;
}

describe.skipIf(!url)("four-admin limit under real concurrency", () => {
  let admin: Client;

  beforeAll(async () => {
    admin = await connect();
    await admin.query(readFileSync(path.join(root, "tests/db/supabase-shim.sql"), "utf8"));
    for (const file of readdirSync(path.join(root, "supabase/migrations"))
      .filter((f) => f.endsWith(".sql"))
      .sort()) {
      await admin.query(readFileSync(path.join(root, "supabase/migrations", file), "utf8"));
    }
    for (const user of [PRIMARY, ...CANDIDATES]) {
      await admin.query(
        `insert into auth.users (id, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values ($1, $2, now(), '{}', '{}')`,
        [user.id, user.email],
      );
    }
    await admin.query(`select private.bootstrap_primary_admin($1)`, [PRIMARY.email]);
  }, 120_000);

  afterAll(async () => {
    await admin?.end();
  });

  async function raceGrants(isolation: "read committed" | "repeatable read", emails: string[]) {
    const clients = await Promise.all(emails.map(() => connect()));
    try {
      // Open every transaction first so the grants genuinely overlap.
      await Promise.all(
        clients.map(async (c) => {
          await c.query(`begin isolation level ${isolation}`);
          await c.query(`select set_config('request.jwt.claims', $1, true)`, [
            JSON.stringify({ sub: PRIMARY.id, role: "authenticated" }),
          ]);
          await c.query("set local role authenticated");
        }),
      );
      return await Promise.allSettled(
        clients.map(async (c, i) => {
          try {
            await c.query(`select * from public.grant_platform_admin($1)`, [emails[i]]);
            await c.query("commit");
          } catch (error) {
            await c.query("rollback").catch(() => undefined);
            throw error;
          }
        }),
      );
    } finally {
      await Promise.all(clients.map((c) => c.end()));
    }
  }

  async function adminCount(): Promise<number> {
    return Number(
      (await admin.query<{ n: string }>(`select count(*) as n from public.platform_admins`)).rows[0]!.n,
    );
  }

  it.each(["read committed", "repeatable read"] as const)(
    "never exceeds four admins when many grants race (%s)",
    async (isolation) => {
      await admin.query(`delete from public.platform_admins where not is_primary`);
      const results = await raceGrants(
        isolation,
        CANDIDATES.map((c) => c.email),
      );
      const granted = results.filter((r) => r.status === "fulfilled").length;
      const failures = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");

      expect(await adminCount()).toBeLessThanOrEqual(4);
      expect(granted).toBeLessThanOrEqual(3);
      expect(granted).toBeGreaterThanOrEqual(1);
      for (const failure of failures) expect(String(failure.reason)).toMatch(/platform_admin_limit_reached/);
      const slots = (
        await admin.query<{ slot: number }>(`select slot from public.platform_admins order by slot`)
      ).rows.map((r) => r.slot);
      expect(new Set(slots).size).toBe(slots.length);
      expect(slots.every((s) => s >= 1 && s <= 4)).toBe(true);
    },
    60_000,
  );
});

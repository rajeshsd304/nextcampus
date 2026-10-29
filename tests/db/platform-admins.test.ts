import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { as, createAuthUser, createTestDatabase, SEED } from "./harness";

const { users } = SEED;
let db: PGlite;

// Test accounts (never the real primary admin's email or a hard-coded real UUID).
const primary = { id: "80000000-0000-4000-8000-000000000001", email: "primary-admin@example.test" };
const candidates = [2, 3, 4, 5].map((n) => ({
  id: `80000000-0000-4000-8000-00000000000${n}`,
  email: `admin-${n}@example.test`,
}));
const unverified = { id: "80000000-0000-4000-8000-000000000009", email: "unverified-admin@example.test" };

async function slots(): Promise<{ user_id: string; slot: number; is_primary: boolean }[]> {
  return (
    await db.query<{ user_id: string; slot: number; is_primary: boolean }>(
      `select user_id, slot, is_primary from public.platform_admins order by slot`,
    )
  ).rows;
}

beforeAll(async () => {
  db = await createTestDatabase();
  await createAuthUser(db, primary);
  for (const c of candidates) await createAuthUser(db, c);
  await createAuthUser(db, { ...unverified, confirmed: false });
});

afterAll(async () => {
  await db.close();
});

describe("migration of existing admins", () => {
  it("keeps the seeded admin as an additional (non-primary) admin in a free slot", async () => {
    expect(await slots()).toEqual([{ user_id: users.superAdmin.id, slot: 2, is_primary: false }]);
  });
});

describe("primary admin bootstrap (operator-only)", () => {
  it("cannot be called by API roles", async () => {
    for (const actor of ["anon", users.superAdmin, primary] as const) {
      await expect(
        as(db, actor, (tx) => tx.query(`select private.bootstrap_primary_admin($1)`, [primary.email])),
      ).rejects.toThrow(/permission denied/);
    }
  });

  it("requires an existing account with a confirmed email", async () => {
    await expect(db.query(`select private.bootstrap_primary_admin('nobody@example.test')`)).rejects.toThrow(
      /CONFIRMED/,
    );
    await expect(db.query(`select private.bootstrap_primary_admin($1)`, [unverified.email])).rejects.toThrow(
      /CONFIRMED/,
    );
  });

  it("makes the verified account primary (slot 1), is idempotent, and refuses a second primary", async () => {
    const { rows } = await db.query<{ id: string }>(`select private.bootstrap_primary_admin($1) as id`, [
      ` ${primary.email.toUpperCase()} `,
    ]);
    expect(rows[0]?.id).toBe(primary.id);
    await db.query(`select private.bootstrap_primary_admin($1)`, [primary.email]);
    expect((await slots()).filter((s) => s.is_primary)).toEqual([
      { user_id: primary.id, slot: 1, is_primary: true },
    ]);
    await expect(
      db.query(`select private.bootstrap_primary_admin($1)`, [candidates[0]!.email]),
    ).rejects.toThrow(/already exists/);
    const audit = await db.query(
      `select 1 from public.audit_logs where action = 'platform_admin.primary_bootstrapped' and target_id = $1`,
      [primary.id],
    );
    expect(audit.rows).toHaveLength(1);
  });
});

describe("granting and revoking additional admins", () => {
  it("only the primary admin can grant — not additional admins, org admins or normal users", async () => {
    for (const actor of [users.superAdmin, users.northAdmin, users.learner, candidates[0]!] as const) {
      await expect(
        as(db, actor, (tx) =>
          tx.query(`select * from public.grant_platform_admin($1)`, [candidates[1]!.email]),
        ),
      ).rejects.toThrow(/not_authorized/);
    }
    await expect(
      as(db, "anon", (tx) =>
        tx.query(`select * from public.grant_platform_admin($1)`, [candidates[1]!.email]),
      ),
    ).rejects.toThrow(/permission denied/);
  });

  it("nobody can self-promote by writing the table directly", async () => {
    for (const actor of [users.learner, users.northAdmin, users.superAdmin, primary] as const) {
      await expect(
        as(db, actor, (tx) =>
          tx.query(`insert into public.platform_admins (user_id) values ($1)`, [actor.id]),
        ),
      ).rejects.toThrow(/permission denied/);
      await expect(
        as(db, actor, (tx) => tx.query(`update public.platform_admins set is_primary = true`)),
      ).rejects.toThrow(/permission denied/);
      await expect(as(db, actor, (tx) => tx.query(`delete from public.platform_admins`))).rejects.toThrow(
        /permission denied/,
      );
    }
  });

  it("grants only existing, verified accounts, once each", async () => {
    await expect(
      as(db, primary, (tx) => tx.query(`select * from public.grant_platform_admin($1)`, [unverified.email])),
    ).rejects.toThrow(/admin_candidate_not_found/);
    await expect(
      as(db, primary, (tx) => tx.query(`select * from public.grant_platform_admin('ghost@example.test')`)),
    ).rejects.toThrow(/admin_candidate_not_found/);
    await expect(
      as(db, primary, (tx) =>
        tx.query(`select * from public.grant_platform_admin($1)`, [users.superAdmin.email]),
      ),
    ).rejects.toThrow(/already_platform_admin/);
  });

  it("enforces the four-admin maximum (1 primary + 3 additional)", async () => {
    // Seeded admin holds slot 2; two more fit.
    for (const candidate of candidates.slice(0, 2)) {
      await as(
        db,
        primary,
        (tx) => tx.query(`select * from public.grant_platform_admin($1)`, [candidate.email]),
        { commit: true },
      );
    }
    expect((await slots()).map((s) => s.slot)).toEqual([1, 2, 3, 4]);
    await expect(
      as(db, primary, (tx) =>
        tx.query(`select * from public.grant_platform_admin($1)`, [candidates[2]!.email]),
      ),
    ).rejects.toThrow(/platform_admin_limit_reached/);

    // Even the table owner cannot add a fifth seat or reuse one.
    await expect(
      db.query(`insert into public.platform_admins (user_id, slot) values ($1, 5)`, [candidates[2]!.id]),
    ).rejects.toThrow(/check constraint/);
    await expect(
      db.query(`insert into public.platform_admins (user_id, slot) values ($1, 3)`, [candidates[2]!.id]),
    ).rejects.toThrow(/duplicate key|unique/);
    await expect(
      db.query(`insert into public.platform_admins (user_id) values ($1)`, [candidates[2]!.id]),
    ).rejects.toThrow(/platform_admin_limit_reached/);
  });

  it("new admins gain platform access (is_super_admin) and are notified; org roles never do", async () => {
    await as(db, candidates[0]!, async (tx) => {
      expect((await tx.query<{ ok: boolean }>(`select private.is_super_admin() as ok`)).rows[0]?.ok).toBe(
        true,
      );
    });
    await as(db, users.northAdmin, async (tx) => {
      expect((await tx.query<{ ok: boolean }>(`select private.is_super_admin() as ok`)).rows[0]?.ok).toBe(
        false,
      );
    });
    const notice = await db.query(
      `select 1 from public.notifications where user_id = $1 and template = 'platform_admin_granted'`,
      [candidates[0]!.id],
    );
    expect(notice.rows).toHaveLength(1);
  });

  it("revokes additional admins, freeing their seat, with audit", async () => {
    await expect(
      as(db, candidates[0]!, (tx) =>
        tx.query(`select public.revoke_platform_admin($1)`, [candidates[1]!.id]),
      ),
    ).rejects.toThrow(/not_authorized/);
    await as(db, primary, (tx) => tx.query(`select public.revoke_platform_admin($1)`, [candidates[1]!.id]), {
      commit: true,
    });
    expect((await slots()).map((s) => s.user_id)).not.toContain(candidates[1]!.id);
    const audit = await db.query<{ action: string }>(
      `select action from public.audit_logs where target_id = $1 and action like 'platform_admin.%' order by id`,
      [candidates[1]!.id],
    );
    expect(audit.rows.map((r) => r.action)).toEqual(["platform_admin.granted", "platform_admin.revoked"]);
    // The freed seat can be reused.
    await as(
      db,
      primary,
      (tx) => tx.query(`select * from public.grant_platform_admin($1)`, [candidates[2]!.email]),
      { commit: true },
    );
    await expect(
      as(db, primary, (tx) => tx.query(`select public.revoke_platform_admin($1)`, [users.learner.id])),
    ).rejects.toThrow(/platform_admin_not_found/);
  });
});

describe("primary admin protection", () => {
  it("cannot be revoked or demoted through the API or by direct SQL", async () => {
    await expect(
      as(db, primary, (tx) => tx.query(`select public.revoke_platform_admin($1)`, [primary.id])),
    ).rejects.toThrow(/primary_admin_protected/);
    await expect(
      db.query(`delete from public.platform_admins where user_id = $1`, [primary.id]),
    ).rejects.toThrow(/primary_admin_protected/);
    await expect(
      db.query(`update public.platform_admins set is_primary = false, slot = 4 where user_id = $1`, [
        primary.id,
      ]),
    ).rejects.toThrow(/primary_admin_protected/);
    await expect(
      db.query(`update public.platform_admins set is_primary = true, slot = 1 where user_id = $1`, [
        candidates[0]!.id,
      ]),
    ).rejects.toThrow(/primary_admin_protected/);
  });

  it("can be transferred only through the operator function", async () => {
    await expect(
      as(db, primary, (tx) => tx.query(`select private.transfer_primary_admin($1)`, [candidates[0]!.email])),
    ).rejects.toThrow(/permission denied/);
    await db.query(`select public.revoke_platform_admin($1)`, [candidates[0]!.id]).catch(() => undefined);
    const before = await slots();
    expect(before.find((s) => s.is_primary)?.user_id).toBe(primary.id);
    await db.query(`select private.transfer_primary_admin($1)`, [candidates[0]!.email]);
    const after = await slots();
    expect(after.find((s) => s.is_primary)?.user_id).toBe(candidates[0]!.id);
    expect(after).toHaveLength(4);
    expect(after.some((s) => s.user_id === primary.id)).toBe(true);
  });
});

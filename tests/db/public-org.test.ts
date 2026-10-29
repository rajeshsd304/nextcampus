import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { as, createAuthUser, createTestDatabase, SEED } from "./harness";

const { users, orgs } = SEED;

let db: PGlite;
let publicOrgId: string;

beforeAll(async () => {
  db = await createTestDatabase();
  const { rows } = await db.query<{ id: string }>(`select id from public.organizations where is_system`);
  expect(rows).toHaveLength(1);
  publicOrgId = rows[0]!.id;
});

afterAll(async () => {
  await db.close();
});

async function membershipRole(userId: string): Promise<string | null> {
  const { rows } = await db.query<{ role: string }>(
    `select role::text from public.organization_members where organization_id = $1 and user_id = $2`,
    [publicOrgId, userId],
  );
  return rows[0]?.role ?? null;
}

describe("public organization", () => {
  it("exists as the single system organization with the reserved slug", async () => {
    const { rows } = await db.query<{ slug: string; status: string }>(
      `select slug, status::text from public.organizations where id = $1`,
      [publicOrgId],
    );
    expect(rows[0]).toEqual({ slug: "public", status: "active" });
  });

  it("enrolls self-signups as students, idempotently and audited", async () => {
    const user = await createAuthUser(db, {
      id: "30000000-0000-4000-8000-000000000001",
      email: "self@example.com",
    });
    expect(await membershipRole(user.id)).toBe("student");

    await as(db, user, async (tx) => {
      const { rows } = await tx.query<{ organization_slug: string; joined: boolean }>(
        `select * from public.join_public_organization()`,
      );
      expect(rows[0]).toEqual({ organization_slug: "public", joined: false });
    });

    const audit = await db.query<{ action: string; organization_id: string }>(
      `select action, organization_id from public.audit_logs where actor_id = $1 and action like 'member.%'`,
      [user.id],
    );
    expect(audit.rows).toEqual([{ action: "member.auto_enrolled", organization_id: publicOrgId }]);
  });

  it("does not enroll people who arrive with a pending invitation, but lets them opt in", async () => {
    await as(
      db,
      users.northAdmin,
      (tx) =>
        tx.query(`select * from public.create_invitation($1, 'invited@example.com', 'student')`, [
          orgs.northbridge,
        ]),
      { commit: true },
    );
    const invited = await createAuthUser(db, {
      id: "30000000-0000-4000-8000-000000000002",
      email: "invited@example.com",
    });
    expect(await membershipRole(invited.id)).toBeNull();

    await as(
      db,
      invited,
      async (tx) => {
        const { rows } = await tx.query<{ joined: boolean }>(
          `select * from public.join_public_organization()`,
        );
        expect(rows[0]?.joined).toBe(true);
      },
      { commit: true },
    );
    expect(await membershipRole(invited.id)).toBe("student");
    const audit = await db.query(
      `select 1 from public.audit_logs where actor_id = $1 and action = 'member.joined_public'`,
      [invited.id],
    );
    expect(audit.rows).toHaveLength(1);
  });

  it("requires authentication to join", async () => {
    await expect(
      as(db, "anon", (tx) => tx.query(`select * from public.join_public_organization()`)),
    ).rejects.toThrow(/permission denied/);
  });
});

describe("public organization privacy", () => {
  it("students see only their own membership and profile", async () => {
    await as(db, users.learner, async (tx) => {
      const members = await tx.query<{ user_id: string }>(
        `select user_id from public.organization_members where organization_id = $1`,
        [publicOrgId],
      );
      expect(members.rows.map((r) => r.user_id)).toEqual([users.learner.id]);

      const profiles = await tx.query<{ id: string }>(`select id from public.profiles`);
      expect(profiles.rows.map((r) => r.id)).toEqual([users.learner.id]);

      const byEmail = await tx.query(`select id from public.profiles where email = $1`, [
        users.learner2.email,
      ]);
      expect(byEmail.rows).toHaveLength(0);

      const byId = await tx.query(`select email from public.profiles where id = $1`, [users.learner2.id]);
      expect(byId.rows).toHaveLength(0);

      const audit = await tx.query(`select id from public.audit_logs where organization_id = $1`, [
        publicOrgId,
      ]);
      expect(audit.rows).toHaveLength(0);
    });
  });

  it("graders in the public organization cannot read the roster either", async () => {
    await db.query(
      `update public.organization_members set role = 'instructor' where organization_id = $1 and user_id = $2`,
      [publicOrgId, users.learner2.id],
    );
    try {
      await as(db, users.learner2, async (tx) => {
        const members = await tx.query<{ user_id: string }>(
          `select user_id from public.organization_members where organization_id = $1`,
          [publicOrgId],
        );
        expect(members.rows.map((r) => r.user_id)).toEqual([users.learner2.id]);
        const profile = await tx.query(`select id from public.profiles where id = $1`, [users.learner.id]);
        expect(profile.rows).toHaveLength(0);
      });
    } finally {
      await db.query(
        `update public.organization_members set role = 'student' where organization_id = $1 and user_id = $2`,
        [publicOrgId, users.learner2.id],
      );
    }
  });

  it("a platform-appointed public org admin can see the roster", async () => {
    await db.query(
      `insert into public.organization_members (organization_id, user_id, role) values ($1, $2, 'org_admin')`,
      [publicOrgId, users.superAdmin.id],
    );
    try {
      // Super admins already see everything; prove it is members.manage, not super-admin, by
      // checking the helper directly for this membership.
      await as(db, users.superAdmin, async (tx) => {
        const { rows } = await tx.query<{ ok: boolean }>(`select private.can_read_roster($1) as ok`, [
          publicOrgId,
        ]);
        expect(rows[0]?.ok).toBe(true);
      });
    } finally {
      await db.query(`delete from public.organization_members where organization_id = $1 and user_id = $2`, [
        publicOrgId,
        users.superAdmin.id,
      ]);
    }
  });

  it("users can belong to the public org and a coaching center; coaching admins see their own roster only", async () => {
    const orgsForDual = await as(
      db,
      users.dual,
      async (tx) =>
        (
          await tx.query<{ is_system: boolean }>(
            `select is_system from public.organizations order by is_system`,
          )
        ).rows,
    );
    expect(orgsForDual.map((r) => r.is_system)).toEqual([false, true]);

    await as(db, users.apexAdmin, async (tx) => {
      const dualProfile = await tx.query(`select id from public.profiles where id = $1`, [users.dual.id]);
      expect(dualProfile.rows).toHaveLength(1);
      const publicRoster = await tx.query(
        `select user_id from public.organization_members where organization_id = $1`,
        [publicOrgId],
      );
      expect(publicRoster.rows).toHaveLength(0);
      const learner = await tx.query(`select id from public.profiles where id = $1`, [users.learner.id]);
      expect(learner.rows).toHaveLength(0);
    });
  });
});

describe("system organization protection", () => {
  it("cannot be suspended, even by a platform admin", async () => {
    await expect(
      as(db, users.superAdmin, (tx) =>
        tx.query(`select public.set_organization_status($1, 'suspended')`, [publicOrgId]),
      ),
    ).rejects.toThrow(/system_organization_protected/);
  });

  it("cannot be renamed, re-slugged, flagged or deleted — not even by the table owner", async () => {
    await expect(
      db.query(`update public.organizations set name = 'Renamed' where id = $1`, [publicOrgId]),
    ).rejects.toThrow(/system_organization_protected/);
    await expect(
      db.query(`update public.organizations set slug = 'renamed' where id = $1`, [publicOrgId]),
    ).rejects.toThrow(/system_organization_protected/);
    await expect(db.query(`delete from public.organizations where id = $1`, [publicOrgId])).rejects.toThrow(
      /system_organization_protected/,
    );
    await expect(
      db.query(`update public.organizations set is_system = true where id = $1`, [orgs.apex]),
    ).rejects.toThrow(/system_organization_protected/);
  });

  it("cannot be updated by tenant admins through the API", async () => {
    // No one holds org.update in the public org; RLS filters the row out.
    const affected = await as(
      db,
      users.apexAdmin,
      async (tx) =>
        (
          await tx.query(`update public.organizations set website = 'https://x.example' where id = $1`, [
            publicOrgId,
          ])
        ).affectedRows,
    );
    expect(affected).toBe(0);
  });

  it("students cannot leave it, and its slug cannot be claimed", async () => {
    await expect(
      as(db, users.learner, (tx) =>
        tx.query(`select public.remove_member($1, $2)`, [publicOrgId, users.learner.id]),
      ),
    ).rejects.toThrow(/system_organization_protected/);
    await expect(
      as(db, users.learner, (tx) =>
        tx.query(`select * from public.create_organization('Mine', 'public', 'other')`),
      ),
    ).rejects.toThrow(/slug_reserved/);
  });

  it("students in the public org hold no management permissions", async () => {
    await expect(
      as(db, users.learner, (tx) =>
        tx.query(`select * from public.create_invitation($1, 'friend@example.com', 'student')`, [
          publicOrgId,
        ]),
      ),
    ).rejects.toThrow(/not_authorized/);
    await expect(
      as(db, users.learner, (tx) =>
        tx.query(`select public.update_member_role($1, $2, 'org_admin')`, [publicOrgId, users.learner.id]),
      ),
    ).rejects.toThrow(/not_authorized/);
  });
});

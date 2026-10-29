import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { as, createTestDatabase, SEED } from "./harness";

const { users, orgs } = SEED;

let db: PGlite;

beforeAll(async () => {
  db = await createTestDatabase();
});

afterAll(async () => {
  await db.close();
});

const EXPOSED_TABLES = [
  "profiles",
  "platform_admins",
  "organizations",
  "organization_members",
  "permissions",
  "role_permissions",
  "invitations",
  "audit_logs",
  "notifications",
  "contact_requests",
];

describe("schema hardening", () => {
  it("enables RLS on every table in the public schema", async () => {
    const { rows } = await db.query<{ relname: string; relrowsecurity: boolean }>(
      `select c.relname, c.relrowsecurity
       from pg_class c join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public' and c.relkind = 'r'`,
    );
    expect(rows.map((r) => r.relname).sort()).toEqual([...EXPOSED_TABLES].sort());
    for (const row of rows) expect(row.relrowsecurity, row.relname).toBe(true);
  });

  it("gives anon no table access at all", async () => {
    for (const table of EXPOSED_TABLES) {
      await expect(as(db, "anon", (tx) => tx.query(`select 1 from public.${table} limit 1`))).rejects.toThrow(
        /permission denied/,
      );
    }
  });

  it("denies direct inserts into tenancy tables for authenticated users", async () => {
    await expect(
      as(db, users.northAdmin, (tx) =>
        tx.query(
          `insert into public.organization_members (organization_id, user_id, role) values ($1, $2, 'org_admin')`,
          [orgs.apex, users.northAdmin.id],
        ),
      ),
    ).rejects.toThrow(/permission denied/);

    await expect(
      as(db, users.northAdmin, (tx) =>
        tx.query(`insert into public.organizations (name, slug, type) values ('X', 'xx-org', 'other')`),
      ),
    ).rejects.toThrow(/permission denied/);

    await expect(
      as(db, users.northStudent, (tx) =>
        tx.query(`insert into public.platform_admins (user_id) values ($1)`, [users.northStudent.id]),
      ),
    ).rejects.toThrow(/permission denied/);

    await expect(
      as(db, users.northAdmin, (tx) =>
        tx.query(
          `insert into public.audit_logs (organization_id, actor_id, action) values ($1, $2, 'fake.event')`,
          [orgs.northbridge, users.northAdmin.id],
        ),
      ),
    ).rejects.toThrow(/permission denied/);
  });

  it("never exposes invitation token hashes to API roles", async () => {
    await expect(
      as(db, users.northAdmin, (tx) => tx.query(`select token_hash from public.invitations`)),
    ).rejects.toThrow(/permission denied/);
  });

  it("does not let API roles call internal helpers", async () => {
    await expect(
      as(db, users.northAdmin, (tx) =>
        tx.query(`select private.write_audit(null, 'x.y', null, null, '{}'::jsonb)`),
      ),
    ).rejects.toThrow(/permission denied/);
    await expect(
      as(db, "anon", (tx) => tx.query(`select public.create_organization('x', 'xyz', 'other')`)),
    ).rejects.toThrow(/permission denied/);
  });

  it("keeps the audit log append-only even for the table owner", async () => {
    await expect(db.query(`delete from public.audit_logs`)).rejects.toThrow(/append_only/);
    await expect(db.query(`update public.audit_logs set action = 'x.y'`)).rejects.toThrow(/append_only/);
  });
});

describe("tenant isolation", () => {
  it("only shows organizations the user belongs to", async () => {
    const rows = await as(
      db,
      users.northStudent,
      async (tx) => (await tx.query<{ slug: string }>(`select slug from public.organizations`)).rows,
    );
    expect(rows.map((r) => r.slug)).toEqual(["northbridge"]);

    const apex = await as(
      db,
      users.apexAdmin,
      async (tx) => (await tx.query<{ slug: string }>(`select slug from public.organizations`)).rows,
    );
    expect(apex.map((r) => r.slug)).toEqual(["apex-coaching"]);
  });

  it("hides other tenants' members, invitations, audit logs and profiles", async () => {
    await as(db, users.apexAdmin, async (tx) => {
      const members = await tx.query(`select * from public.organization_members where organization_id = $1`, [
        orgs.northbridge,
      ]);
      expect(members.rows).toHaveLength(0);

      const invites = await tx.query(`select id from public.invitations where organization_id = $1`, [
        orgs.northbridge,
      ]);
      expect(invites.rows).toHaveLength(0);

      const audit = await tx.query(`select id from public.audit_logs where organization_id = $1`, [
        orgs.northbridge,
      ]);
      expect(audit.rows).toHaveLength(0);

      const profile = await tx.query(`select id from public.profiles where id = $1`, [users.northStudent.id]);
      expect(profile.rows).toHaveLength(0);
    });
  });

  it("prevents updating another tenant's organization", async () => {
    const updated = await as(db, users.apexAdmin, async (tx) => {
      const res = await tx.query(`update public.organizations set name = 'Hijacked' where id = $1`, [
        orgs.northbridge,
      ]);
      return res.affectedRows;
    });
    expect(updated).toBe(0);
  });

  it("prevents non-admin members from updating their own organization", async () => {
    const updated = await as(db, users.northInstructor, async (tx) => {
      const res = await tx.query(`update public.organizations set name = 'Renamed' where id = $1`, [
        orgs.northbridge,
      ]);
      return res.affectedRows;
    });
    expect(updated).toBe(0);
  });

  it("lets an org admin update permitted columns but not status or slug", async () => {
    const updated = await as(db, users.northAdmin, async (tx) => {
      const res = await tx.query(`update public.organizations set name = 'Northbridge Univ.' where id = $1`, [
        orgs.northbridge,
      ]);
      const audit = await tx.query<{ action: string }>(
        `select action from public.audit_logs where organization_id = $1 and action = 'organization.updated'`,
        [orgs.northbridge],
      );
      expect(audit.rows).toHaveLength(1);
      return res.affectedRows;
    });
    expect(updated).toBe(1);

    await expect(
      as(db, users.northAdmin, (tx) =>
        tx.query(`update public.organizations set status = 'suspended' where id = $1`, [orgs.northbridge]),
      ),
    ).rejects.toThrow(/permission denied/);
    await expect(
      as(db, users.northAdmin, (tx) =>
        tx.query(`update public.organizations set slug = 'stolen' where id = $1`, [orgs.northbridge]),
      ),
    ).rejects.toThrow(/permission denied/);
  });

  it("students cannot read the roster or other students' profiles", async () => {
    await as(db, users.northStudent, async (tx) => {
      const members = await tx.query<{ user_id: string }>(`select user_id from public.organization_members`);
      expect(members.rows.map((r) => r.user_id)).toEqual([users.northStudent.id]);
      const profiles = await tx.query<{ id: string }>(`select id from public.profiles`);
      expect(profiles.rows.map((r) => r.id)).toEqual([users.northStudent.id]);
    });
  });

  it("instructors can read the roster of their own organization only", async () => {
    await as(db, users.northInstructor, async (tx) => {
      const members = await tx.query(`select user_id from public.organization_members`);
      expect(members.rows).toHaveLength(4);
      const invites = await tx.query(`select id from public.invitations`);
      expect(invites.rows).toHaveLength(0);
      const audit = await tx.query(`select id from public.audit_logs where organization_id is not null`);
      expect(audit.rows).toHaveLength(0);
    });
  });

  it("profile updates are limited to the caller and to user-editable columns", async () => {
    const affected = await as(
      db,
      users.northAdmin,
      async (tx) =>
        (
          await tx.query(`update public.profiles set full_name = 'Pwned' where id = $1`, [
            users.northStudent.id,
          ])
        ).affectedRows,
    );
    expect(affected).toBe(0);

    await expect(
      as(db, users.northStudent, (tx) =>
        tx.query(`update public.profiles set email = 'x@y.z' where id = $1`, [users.northStudent.id]),
      ),
    ).rejects.toThrow(/permission denied/);

    await expect(
      as(db, users.newcomer, (tx) =>
        tx.query(`update public.profiles set onboarded_at = now() where id = $1`, [users.newcomer.id]),
      ),
    ).rejects.toThrow(/permission denied/);
  });

  it("notifications are private to their owner and only marked read via RPC", async () => {
    await as(db, users.apexAdmin, async (tx) => {
      const rows = await tx.query(`select id from public.notifications where user_id = $1`, [
        users.northStudent.id,
      ]);
      expect(rows.rows).toHaveLength(0);
    });
    await expect(
      as(db, users.northStudent, (tx) => tx.query(`update public.notifications set read_at = now()`)),
    ).rejects.toThrow(/permission denied/);

    await as(db, users.northStudent, async (tx) => {
      const res = await tx.query<{ count: number }>(`select public.mark_notifications_read() as count`);
      expect(res.rows[0]?.count).toBe(1);
      const unread = await tx.query(`select id from public.notifications where read_at is null`);
      expect(unread.rows).toHaveLength(0);
    });
  });

  it("super admins can see every tenant; contact requests are super-admin only", async () => {
    await as(db, users.superAdmin, async (tx) => {
      const res = await tx.query(`select id from public.organizations`);
      expect(res.rows).toHaveLength(2);
    });
    await as(db, users.northAdmin, async (tx) => {
      const res = await tx.query(`select id from public.contact_requests`);
      expect(res.rows).toHaveLength(0);
    });
  });
});

import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { as, createAuthUser, createTestDatabase, SEED } from "./harness";

const { users, orgs } = SEED;
let db: PGlite;

beforeAll(async () => {
  db = await createTestDatabase();
});
afterAll(async () => {
  await db.close();
});

describe("translatable notifications", () => {
  it("records a template key and params alongside the English fallback", async () => {
    const invitee = await createAuthUser(db, {
      id: "50000000-0000-4000-8000-000000000001",
      email: "tpl@example.com",
    });
    await as(
      db,
      users.northAdmin,
      (tx) =>
        tx.query(`select * from public.create_invitation($1, $2, 'instructor')`, [
          orgs.northbridge,
          invitee.email,
        ]),
      { commit: true },
    );
    const { rows } = await db.query<{ template: string; params: Record<string, string>; title: string }>(
      `select template, params, title from public.notifications where user_id = $1`,
      [invitee.id],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]!.template).toBe("invitation_received");
    expect(rows[0]!.params).toMatchObject({ role: "instructor" });
    expect(rows[0]!.params.organization).toBeTruthy();
    expect(rows[0]!.title.length).toBeGreaterThan(0);
  });

  it("covers role changes and password changes", async () => {
    await as(
      db,
      users.northAdmin,
      async (tx) => {
        await tx.query(`select public.update_member_role($1, $2, 'invigilator')`, [
          orgs.northbridge,
          users.northStudent.id,
        ]);
      },
      { commit: true },
    );
    await as(
      db,
      users.northStudent,
      (tx) => tx.query(`select public.log_auth_event('auth.password_changed', null)`),
      {
        commit: true,
      },
    );
    const { rows } = await db.query<{ template: string }>(
      `select template from public.notifications where user_id = $1 and template is not null order by created_at, id`,
      [users.northStudent.id],
    );
    expect(rows.map((r) => r.template)).toEqual(expect.arrayContaining(["role_changed", "password_changed"]));
  });

  it("rejects malformed template keys and non-object params", async () => {
    await expect(
      db.query(
        `insert into public.notifications (user_id, kind, title, template) values ($1, 'system', 'x', 'Bad Key!')`,
        [users.learner.id],
      ),
    ).rejects.toThrow(/check constraint/);
    await expect(
      db.query(
        `insert into public.notifications (user_id, kind, title, params) values ($1, 'system', 'x', '[]')`,
        [users.learner.id],
      ),
    ).rejects.toThrow(/check constraint/);
  });
});

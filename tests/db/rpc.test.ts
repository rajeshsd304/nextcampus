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

describe("profile provisioning and onboarding", () => {
  it("creates a profile and sign-up audit entry when an auth user is created", async () => {
    await createAuthUser(db, {
      id: "20000000-0000-4000-8000-000000000001",
      email: "Mixed.Case@Example.com",
      fullName: "Mixed Case",
    });
    const { rows } = await db.query<{ email: string; full_name: string; onboarded_at: string | null }>(
      `select email, full_name, onboarded_at from public.profiles where id = '20000000-0000-4000-8000-000000000001'`,
    );
    expect(rows[0]).toEqual({ email: "mixed.case@example.com", full_name: "Mixed Case", onboarded_at: null });
    const audit = await db.query(
      `select action from public.audit_logs where actor_id = '20000000-0000-4000-8000-000000000001' order by id`,
    );
    // Phase 1.5: self-signups are also enrolled in the public organization.
    expect(audit.rows).toEqual([{ action: "auth.sign_up" }, { action: "member.auto_enrolled" }]);
  });

  it("completes onboarding with a server timestamp and validates the timezone", async () => {
    await expect(
      as(db, users.newcomer, (tx) =>
        tx.query(`select public.complete_onboarding('Noor', null, 'Mars/Olympus')`),
      ),
    ).rejects.toThrow(/invalid_timezone/);

    await as(db, users.newcomer, async (tx) => {
      await tx.query(`select public.complete_onboarding('Noor Newcomer', 'Noor', 'Asia/Dhaka')`);
      const { rows } = await tx.query<{ onboarded_at: Date | null; timezone: string }>(
        `select onboarded_at, timezone from public.profiles where id = $1`,
        [users.newcomer.id],
      );
      expect(rows[0]?.onboarded_at).toBeInstanceOf(Date);
      expect(rows[0]?.timezone).toBe("Asia/Dhaka");
    });
  });
});

describe("create_organization", () => {
  it("requires a completed profile", async () => {
    await expect(
      as(db, users.newcomer, (tx) =>
        tx.query(`select * from public.create_organization('Org', 'new-org', 'other')`),
      ),
    ).rejects.toThrow(/profile_incomplete/);
  });

  it("validates, reserves and de-duplicates slugs", async () => {
    await expect(
      as(db, users.northStudent, (tx) =>
        tx.query(`select * from public.create_organization('Org', 'Bad Slug!', 'other')`),
      ),
    ).rejects.toThrow(/invalid_slug/);
    await expect(
      as(db, users.northStudent, (tx) =>
        tx.query(`select * from public.create_organization('Org', 'admin', 'other')`),
      ),
    ).rejects.toThrow(/slug_reserved/);
    await expect(
      as(db, users.northStudent, (tx) =>
        tx.query(`select * from public.create_organization('Org', 'northbridge', 'other')`),
      ),
    ).rejects.toThrow(/slug_taken/);
  });

  it("makes the creator an org admin and writes an audit log", async () => {
    await as(db, users.northStudent, async (tx) => {
      const { rows } = await tx.query<{ organization_id: string; organization_slug: string }>(
        `select * from public.create_organization('Sasha Tutoring', 'sasha-tutoring', 'independent_instructor')`,
      );
      const orgId = rows[0]?.organization_id;
      expect(rows[0]?.organization_slug).toBe("sasha-tutoring");
      const member = await tx.query<{ role: string }>(
        `select role from public.organization_members where organization_id = $1 and user_id = $2`,
        [orgId, users.northStudent.id],
      );
      expect(member.rows[0]?.role).toBe("org_admin");
      const audit = await tx.query(`select action from public.audit_logs where organization_id = $1`, [
        orgId,
      ]);
      expect(audit.rows).toEqual([{ action: "organization.created" }]);
    });
  });
});

describe("invitations", () => {
  it("only lets admins of the organization invite", async () => {
    await expect(
      as(db, users.northInstructor, (tx) =>
        tx.query(`select * from public.create_invitation($1, 'x@example.com', 'student')`, [
          orgs.northbridge,
        ]),
      ),
    ).rejects.toThrow(/not_authorized/);
    await expect(
      as(db, users.apexAdmin, (tx) =>
        tx.query(`select * from public.create_invitation($1, 'x@example.com', 'org_admin')`, [
          orgs.northbridge,
        ]),
      ),
    ).rejects.toThrow(/not_authorized/);
  });

  it("rejects inviting an existing member", async () => {
    await expect(
      as(db, users.northAdmin, (tx) =>
        tx.query(`select * from public.create_invitation($1, 'STUDENT@northbridge.test', 'student')`, [
          orgs.northbridge,
        ]),
      ),
    ).rejects.toThrow(/already_member/);
  });

  it("runs the full invite → accept flow with email binding", async () => {
    const invitee = await createAuthUser(db, {
      id: "20000000-0000-4000-8000-000000000010",
      email: "invitee@example.com",
    });
    const attacker = await createAuthUser(db, {
      id: "20000000-0000-4000-8000-000000000011",
      email: "attacker@example.com",
    });

    const token = await as(
      db,
      users.northAdmin,
      async (tx) => {
        const { rows } = await tx.query<{ invitation_token: string }>(
          `select * from public.create_invitation($1, ' Invitee@Example.com ', 'instructor')`,
          [orgs.northbridge],
        );
        return rows[0]!.invitation_token;
      },
      { commit: true },
    );
    expect(token).toMatch(/^[0-9a-f]{64}$/);

    // Stored hashed, never raw.
    const stored = await db.query<{ token_hash: string }>(
      `select token_hash from public.invitations where email = 'invitee@example.com'`,
    );
    expect(stored.rows[0]?.token_hash).not.toBe(token);

    // Anonymous preview masks the email.
    const preview = await as(
      db,
      "anon",
      async (tx) =>
        (
          await tx.query<{ email_hint: string; organization_slug: string }>(
            `select * from public.get_invitation_preview($1)`,
            [token],
          )
        ).rows,
    );
    expect(preview[0]).toMatchObject({ email_hint: "i•••@example.com", organization_slug: "northbridge" });

    // The invitee got an in-app notification.
    const notified = await db.query(`select title from public.notifications where user_id = $1`, [
      invitee.id,
    ]);
    expect(notified.rows).toHaveLength(1);

    // A different signed-in user cannot use the token.
    await expect(
      as(db, attacker, (tx) => tx.query(`select * from public.accept_invitation($1)`, [token])),
    ).rejects.toThrow(/invitation_email_mismatch/);

    // The invitee sees it in their list and can accept it.
    await as(
      db,
      invitee,
      async (tx) => {
        const list = await tx.query(`select * from public.list_my_invitations()`);
        expect(list.rows).toHaveLength(1);
        const { rows } = await tx.query<{ member_role: string; organization_slug: string }>(
          `select * from public.accept_invitation($1)`,
          [token],
        );
        expect(rows[0]).toMatchObject({ member_role: "instructor", organization_slug: "northbridge" });
      },
      { commit: true },
    );

    // Single use.
    await expect(
      as(db, invitee, (tx) => tx.query(`select * from public.accept_invitation($1)`, [token])),
    ).rejects.toThrow(/invitation_not_pending/);

    const audit = await db.query<{ action: string }>(
      `select action from public.audit_logs where organization_id = $1 and action like 'invitation.%' order by id`,
      [orgs.northbridge],
    );
    expect(audit.rows.map((r) => r.action)).toEqual(["invitation.created", "invitation.accepted"]);
  });

  it("refuses unverified emails and expired invitations", async () => {
    const unverified = await createAuthUser(db, {
      id: "20000000-0000-4000-8000-000000000020",
      email: "unverified@example.com",
      confirmed: false,
    });
    const token = await as(
      db,
      users.northAdmin,
      async (tx) =>
        (
          await tx.query<{ invitation_token: string }>(
            `select * from public.create_invitation($1, 'unverified@example.com', 'student')`,
            [orgs.northbridge],
          )
        ).rows[0]!.invitation_token,
      { commit: true },
    );
    await expect(
      as(db, unverified, (tx) => tx.query(`select * from public.accept_invitation($1)`, [token])),
    ).rejects.toThrow(/email_not_verified/);

    await db.query(`update auth.users set email_confirmed_at = now() where id = $1`, [unverified.id]);
    await db.query(
      `update public.invitations set expires_at = now() - interval '1 minute' where email = 'unverified@example.com'`,
    );
    await expect(
      as(db, unverified, (tx) => tx.query(`select * from public.accept_invitation($1)`, [token])),
    ).rejects.toThrow(/invitation_expired/);
  });

  it("accepts the seeded newcomer invitation by id after onboarding", async () => {
    await as(db, users.newcomer, async (tx) => {
      const list = await tx.query<{ invitation_id: string }>(`select * from public.list_my_invitations()`);
      expect(list.rows).toHaveLength(1);
      const { rows } = await tx.query<{ member_role: string }>(
        `select * from public.accept_invitation_by_id($1)`,
        [list.rows[0]!.invitation_id],
      );
      expect(rows[0]?.member_role).toBe("student");
    });
  });

  it("lets admins revoke but hides other tenants' invitations", async () => {
    const id = await db.query<{ id: string }>(
      `select id from public.invitations where email = 'newuser@nextcampus.test'`,
    );
    const invitationId = id.rows[0]!.id;
    await expect(
      as(db, users.apexAdmin, (tx) => tx.query(`select public.revoke_invitation($1)`, [invitationId])),
    ).rejects.toThrow(/invitation_not_found/);
    await as(db, users.northAdmin, async (tx) => {
      await tx.query(`select public.revoke_invitation($1)`, [invitationId]);
      const res = await tx.query<{ status: string }>(`select status from public.invitations where id = $1`, [
        invitationId,
      ]);
      expect(res.rows[0]?.status).toBe("revoked");
    });
  });

  it("rejects malformed tokens without leaking anything", async () => {
    const preview = await as(
      db,
      "anon",
      async (tx) => (await tx.query(`select * from public.get_invitation_preview('nope')`)).rows,
    );
    expect(preview).toHaveLength(0);
    await expect(
      as(db, users.northStudent, (tx) => tx.query(`select * from public.accept_invitation('nope')`)),
    ).rejects.toThrow(/invitation_not_found/);
  });
});

describe("membership management", () => {
  it("only admins of the organization can change roles", async () => {
    await expect(
      as(db, users.northInstructor, (tx) =>
        tx.query(`select public.update_member_role($1, $2, 'org_admin')`, [
          orgs.northbridge,
          users.northInstructor.id,
        ]),
      ),
    ).rejects.toThrow(/not_authorized/);
    await expect(
      as(db, users.apexAdmin, (tx) =>
        tx.query(`select public.update_member_role($1, $2, 'student')`, [
          orgs.northbridge,
          users.northAdmin.id,
        ]),
      ),
    ).rejects.toThrow(/not_authorized/);
  });

  it("changes roles with an audit trail and a notification", async () => {
    await as(db, users.northAdmin, async (tx) => {
      await tx.query(`select public.update_member_role($1, $2, 'invigilator')`, [
        orgs.northbridge,
        users.northStudent.id,
      ]);
      const audit = await tx.query<{ metadata: { from: string; to: string } }>(
        `select metadata from public.audit_logs where action = 'member.role_changed' and target_id = $1`,
        [users.northStudent.id],
      );
      expect(audit.rows[0]?.metadata).toEqual({ from: "student", to: "invigilator" });
    });
  });

  it("protects the last organization admin", async () => {
    await expect(
      as(db, users.northAdmin, (tx) =>
        tx.query(`select public.update_member_role($1, $2, 'student')`, [
          orgs.northbridge,
          users.northAdmin.id,
        ]),
      ),
    ).rejects.toThrow(/last_admin/);
    await expect(
      as(db, users.northAdmin, (tx) =>
        tx.query(`select public.remove_member($1, $2)`, [orgs.northbridge, users.northAdmin.id]),
      ),
    ).rejects.toThrow(/last_admin/);
  });

  it("lets members leave and admins remove members", async () => {
    await as(db, users.northReviewer, async (tx) => {
      await tx.query(`select public.remove_member($1, $2)`, [orgs.northbridge, users.northReviewer.id]);
      const res = await tx.query(`select * from public.organizations where id = $1`, [orgs.northbridge]);
      expect(res.rows).toHaveLength(0);
    });
    await expect(
      as(db, users.northStudent, (tx) =>
        tx.query(`select public.remove_member($1, $2)`, [orgs.northbridge, users.northInstructor.id]),
      ),
    ).rejects.toThrow(/not_authorized/);
    await as(db, users.northAdmin, async (tx) => {
      await tx.query(`select public.remove_member($1, $2)`, [orgs.northbridge, users.northInstructor.id]);
      const audit = await tx.query(`select id from public.audit_logs where action = 'member.removed'`);
      expect(audit.rows).toHaveLength(1);
    });
  });
});

describe("platform administration", () => {
  it("only super admins can suspend organizations, and suspension removes permissions", async () => {
    await expect(
      as(db, users.northAdmin, (tx) =>
        tx.query(`select public.set_organization_status($1, 'suspended')`, [orgs.northbridge]),
      ),
    ).rejects.toThrow(/not_authorized/);

    await as(
      db,
      users.superAdmin,
      (tx) => tx.query(`select public.set_organization_status($1, 'suspended')`, [orgs.apex]),
      {
        commit: true,
      },
    );
    await expect(
      as(db, users.apexAdmin, (tx) =>
        tx.query(`select * from public.create_invitation($1, 'a@b.co', 'student')`, [orgs.apex]),
      ),
    ).rejects.toThrow(/not_authorized/);
    // Members can still see their organization (to understand why access is limited).
    const visible = await as(
      db,
      users.apexAdmin,
      async (tx) => (await tx.query(`select status from public.organizations`)).rows,
    );
    expect(visible).toEqual([{ status: "suspended" }]);
    await db.query(`update public.organizations set status = 'active' where id = $1`, [orgs.apex]);
  });
});

describe("auth event logging and contact requests", () => {
  it("logs allow-listed auth events for the caller only", async () => {
    await as(db, users.northStudent, async (tx) => {
      await tx.query(`select public.log_auth_event('auth.sign_in', 'password')`);
      const rows = await tx.query<{ actor_id: string; metadata: unknown }>(
        `select actor_id, metadata from public.audit_logs where action = 'auth.sign_in'`,
      );
      expect(rows.rows).toEqual([{ actor_id: users.northStudent.id, metadata: { method: "password" } }]);
    });
    await expect(
      as(db, users.northStudent, (tx) =>
        tx.query(`select public.log_auth_event('organization.created', null)`),
      ),
    ).rejects.toThrow(/invalid_input/);
  });

  it("accepts valid anonymous contact requests and rate limits", async () => {
    await as(db, "anon", async (tx) => {
      for (let i = 0; i < 5; i++) {
        await tx.query(
          `select public.submit_contact_request('Ada', 'ada@example.com', null, 'sales', 'We would like a demo please.')`,
        );
      }
      await expect(
        tx.query(
          `select public.submit_contact_request('Ada', 'ada@example.com', null, 'sales', 'We would like a demo please.')`,
        ),
      ).rejects.toThrow(/rate_limited/);
    }).catch((error: unknown) => {
      // The rate-limit error aborts the transaction; that's the expected end state.
      if (!(error instanceof Error) || !/rate_limited|aborted/.test(error.message)) throw error;
    });
    await expect(
      as(db, "anon", (tx) =>
        tx.query(`select public.submit_contact_request('', 'bad', null, 'sales', 'short')`),
      ),
    ).rejects.toThrow(/invalid_input/);
  });
});

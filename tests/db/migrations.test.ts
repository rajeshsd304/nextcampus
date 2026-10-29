import { describe, expect, it } from "vitest";
import { applySqlFile, as, createAuthUser, createTestDatabase, migrationFiles } from "./harness";

const PHASE_1_LAST = "20261029000400_permissions.sql";

describe("Phase 1.5 migrations on an existing Phase 1 database", () => {
  it("apply cleanly on top of Phase 1 data and back-fill only unaffiliated self-signups", async () => {
    const db = await createTestDatabase({ migrationsUpTo: PHASE_1_LAST, referenceData: false, seed: false });
    try {
      // Phase 1 state: an org with an admin, a lone user, an invited user, a platform admin.
      const admin = await createAuthUser(db, {
        id: "40000000-0000-4000-8000-000000000001",
        email: "admin@example.com",
      });
      const lone = await createAuthUser(db, {
        id: "40000000-0000-4000-8000-000000000002",
        email: "lone@example.com",
      });
      const invited = await createAuthUser(db, {
        id: "40000000-0000-4000-8000-000000000003",
        email: "invited@example.com",
      });
      const staff = await createAuthUser(db, {
        id: "40000000-0000-4000-8000-000000000004",
        email: "staff@example.com",
      });
      await db.query(`update public.profiles set onboarded_at = now()`);
      await db.query(`insert into public.platform_admins (user_id) values ($1)`, [staff.id]);
      const org = await as(
        db,
        admin,
        async (tx) =>
          (
            await tx.query<{ organization_id: string }>(
              `select * from public.create_organization('Acme', 'acme', 'other')`,
            )
          ).rows[0]!.organization_id,
        { commit: true },
      );
      // An invitation issued in Phase 1 to a user who already has an account.
      await as(
        db,
        admin,
        (tx) => tx.query(`select * from public.create_invitation($1, $2, 'student')`, [org, invited.email]),
        { commit: true },
      );
      // Phase 1 trigger: no public enrollment existed yet.
      const before = await db.query(`select count(*)::int as n from public.organization_members`);
      expect(before.rows).toEqual([{ n: 1 }]);

      for (const file of migrationFiles(PHASE_1_LAST)) await applySqlFile(db, `supabase/migrations/${file}`);
      await applySqlFile(db, "supabase/reference-data/catalog.sql");

      const enrolled = await db.query<{ user_id: string }>(
        `select m.user_id from public.organization_members m join public.organizations o on o.id = m.organization_id
         where o.is_system order by m.user_id`,
      );
      expect(enrolled.rows.map((r) => r.user_id)).toEqual([lone.id]);

      // Phase 1 data is intact.
      const acme = await db.query(`select slug, is_system from public.organizations where id = $1`, [org]);
      expect(acme.rows).toEqual([{ slug: "acme", is_system: false }]);
    } finally {
      await db.close();
    }
  });

  it("roll back to the Phase 1 schema and re-apply (up → down → up)", async () => {
    const db = await createTestDatabase();
    try {
      const phase15 = migrationFiles(PHASE_1_LAST);
      for (const file of [...phase15].reverse()) {
        await applySqlFile(db, `supabase/rollbacks/${file.replace(/\.sql$/, ".down.sql")}`);
      }

      const tables = await db.query<{ n: number }>(
        `select count(*)::int as n from pg_tables where schemaname = 'public' and tablename in ('universities','exam_targets','subjects','university_categories','exam_target_subjects')`,
      );
      expect(tables.rows).toEqual([{ n: 0 }]);
      const columns = await db.query(
        `select column_name from information_schema.columns
         where table_schema = 'public' and column_name in ('is_system', 'preferred_locale', 'preferred_numerals')`,
      );
      expect(columns.rows).toEqual([]);

      // Phase 1 behavior restored: a new signup is not enrolled anywhere.
      const user = await createAuthUser(db, {
        id: "40000000-0000-4000-8000-000000000010",
        email: "after-down@example.com",
      });
      const memberships = await db.query(`select 1 from public.organization_members where user_id = $1`, [
        user.id,
      ]);
      expect(memberships.rows).toHaveLength(0);

      for (const file of phase15) await applySqlFile(db, `supabase/migrations/${file}`);
      await applySqlFile(db, "supabase/reference-data/catalog.sql");
      const publicOrg = await db.query(`select 1 from public.organizations where is_system`);
      expect(publicOrg.rows).toHaveLength(1);
    } finally {
      await db.close();
    }
  });
});

const PHASE_15_LAST = "20261030000400_notification_templates.sql";

describe("Phase 2 migrations on an existing Phase 1.5 database", () => {
  it("apply on top of Phase 1.5 data, keep it intact, and support question authoring", async () => {
    const db = await createTestDatabase({ migrationsUpTo: PHASE_15_LAST, referenceData: false, seed: false });
    try {
      // Phase 1.5 state: catalog rows, a coaching org with an admin, a public learner.
      await db.exec(`
        insert into public.university_categories (key, name_en, name_bn) values ('zz_cat', 'Zz', 'জেড');
        insert into public.subjects (slug, name_en, name_bn) values ('zz-subject', 'Zz subject', 'জেড বিষয়');
      `);
      const admin = await createAuthUser(db, {
        id: "70000000-0000-4000-8000-000000000001",
        email: "p15-admin@example.com",
      });
      await createAuthUser(db, {
        id: "70000000-0000-4000-8000-000000000002",
        email: "p15-learner@example.com",
      });
      await db.query(`update public.profiles set onboarded_at = now()`);
      const org = await as(
        db,
        admin,
        async (tx) =>
          (
            await tx.query<{ organization_id: string }>(
              `select * from public.create_organization('Coach', 'coach-p15', 'coaching_center')`,
            )
          ).rows[0]!.organization_id,
        { commit: true },
      );
      const before = await db.query<{ n: number }>(
        `select count(*)::int as n from public.organization_members`,
      );

      for (const file of migrationFiles(PHASE_15_LAST)) await applySqlFile(db, `supabase/migrations/${file}`);
      await applySqlFile(db, "supabase/reference-data/catalog.sql");

      const after = await db.query<{ n: number }>(
        `select count(*)::int as n from public.organization_members`,
      );
      expect(after.rows).toEqual(before.rows);

      // Existing roles gained question permissions: the Phase 1.5 org admin can author right away.
      await db.query(`insert into public.topics (subject_id, slug, name_en, name_bn)
                      select id, 'zz-topic', 'Zz topic', 'জেড অধ্যায়' from public.subjects where slug = 'zz-subject'`);
      const ids = await db.query<{ subject_id: string; id: string }>(
        `select subject_id, id from public.topics where slug = 'zz-topic'`,
      );
      const saved = await as(db, admin, async (tx) => {
        const { rows } = await tx.query<{ revision: number }>(
          `select * from public.save_question(null, $1, $2)`,
          [
            org,
            JSON.stringify({
              type: "mcq",
              subject_id: ids.rows[0]!.subject_id,
              topic_id: ids.rows[0]!.id,
              stem_bn: "প্রশ্ন",
              stem_en: "Question",
              mcq: {
                options: [
                  { text_bn: "ক", text_en: "A" },
                  { text_bn: "খ", text_en: "B" },
                ],
                correct_index: 0,
              },
            }),
          ],
        );
        return rows[0]!;
      });
      expect(saved.revision).toBe(1);
    } finally {
      await db.close();
    }
  });
});

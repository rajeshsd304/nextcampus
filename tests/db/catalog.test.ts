import type { PGlite, Transaction } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { as, createTestDatabase, SEED } from "./harness";

const { users } = SEED;

let db: PGlite;

beforeAll(async () => {
  db = await createTestDatabase();
});

afterAll(async () => {
  await db.close();
});

const CATALOG_TABLES = [
  "university_categories",
  "universities",
  "subjects",
  "exam_targets",
  "exam_target_subjects",
];

/** The query the public catalog runs, expressed in SQL. */
async function visibleUniversitySlugs(tx: Transaction): Promise<string[]> {
  const { rows } = await tx.query<{ slug: string }>(
    `select slug from public.universities order by sort_order`,
  );
  return rows.map((r) => r.slug);
}

async function anyCategoryKey(): Promise<string> {
  const { rows } = await db.query<{ key: string }>(
    `select key from public.university_categories where is_active limit 1`,
  );
  return rows[0]!.key;
}

const testUniversity = (category: string) => ({
  slug: "zz-test-university",
  name_en: "Test University",
  name_bn: "পরীক্ষামূলক বিশ্ববিদ্যালয়",
  short_code: "TU",
  category_key: category,
});

async function insertUniversity(tx: Transaction, row: ReturnType<typeof testUniversity>): Promise<string> {
  const { rows } = await tx.query<{ id: string }>(
    `insert into public.universities (slug, name_en, name_bn, short_code, category_key, sort_order)
     values ($1, $2, $3, $4, $5, 99990) returning id`,
    [row.slug, row.name_en, row.name_bn, row.short_code, row.category_key],
  );
  return rows[0]!.id;
}

describe("reference data integrity (data-driven)", () => {
  it("every university references an existing category and has bilingual names", async () => {
    const { rows } = await db.query<{ orphan: number; missing_names: number; total: number }>(
      `select
         count(*) filter (where c.key is null)::int as orphan,
         count(*) filter (where btrim(u.name_bn) = '' or btrim(u.name_en) = '')::int as missing_names,
         count(*)::int as total
       from public.universities u left join public.university_categories c on c.key = u.category_key`,
    );
    expect(rows[0]!.total).toBeGreaterThan(0);
    expect(rows[0]).toMatchObject({ orphan: 0, missing_names: 0 });
  });

  it("every seeded university has at least one exam target and every target has subjects", async () => {
    const withoutTargets = await db.query(
      `select u.slug from public.universities u where not exists (select 1 from public.exam_targets t where t.university_id = u.id)`,
    );
    expect(withoutTargets.rows).toEqual([]);
    const withoutSubjects = await db.query(
      `select t.slug from public.exam_targets t where not exists (select 1 from public.exam_target_subjects s where s.exam_target_id = t.id)`,
    );
    expect(withoutSubjects.rows).toEqual([]);
  });

  it("the reference data script is idempotent", async () => {
    const before = await db.query<{ n: number }>(
      `select (select count(*) from public.universities) + (select count(*) from public.exam_targets) + (select count(*) from public.exam_target_subjects) as n`,
    );
    const { readFileSync } = await import("node:fs");
    await db.exec(readFileSync("supabase/reference-data/catalog.sql", "utf8"));
    const after = await db.query<{ n: number }>(
      `select (select count(*) from public.universities) + (select count(*) from public.exam_targets) + (select count(*) from public.exam_target_subjects) as n`,
    );
    expect(after.rows[0]!.n).toBe(before.rows[0]!.n);
  });
});

describe("public read access", () => {
  it("anon and signed-in users can read every active catalog row", async () => {
    const totals = await db.query<{ u: number; t: number }>(
      `select (select count(*) from public.universities where is_active)::int as u,
              (select count(*) from public.exam_targets where is_active)::int as t`,
    );
    for (const actor of ["anon", users.learner] as const) {
      await as(db, actor, async (tx) => {
        for (const table of CATALOG_TABLES) await tx.query(`select 1 from public.${table} limit 1`);
        const u = await tx.query(`select id from public.universities`);
        const t = await tx.query(`select id from public.exam_targets`);
        expect(u.rows).toHaveLength(totals.rows[0]!.u);
        expect(t.rows).toHaveLength(totals.rows[0]!.t);
      });
    }
  });

  it("inactive universities, their targets, and universities in inactive categories are hidden", async () => {
    const { rows } = await db.query<{ id: string; slug: string; category_key: string }>(
      `select id, slug, category_key from public.universities where is_active order by sort_order limit 1`,
    );
    const target = rows[0]!;
    await db.query(`update public.universities set is_active = false where id = $1`, [target.id]);
    try {
      for (const actor of ["anon", users.learner, users.apexAdmin] as const) {
        await as(db, actor, async (tx) => {
          expect(await visibleUniversitySlugs(tx)).not.toContain(target.slug);
          const targets = await tx.query(`select id from public.exam_targets where university_id = $1`, [
            target.id,
          ]);
          expect(targets.rows).toHaveLength(0);
        });
      }
      await as(db, users.superAdmin, async (tx) => {
        expect(await visibleUniversitySlugs(tx)).toContain(target.slug);
      });
    } finally {
      await db.query(`update public.universities set is_active = true where id = $1`, [target.id]);
    }

    await db.query(`update public.university_categories set is_active = false where key = $1`, [
      target.category_key,
    ]);
    try {
      await as(db, "anon", async (tx) => {
        expect(await visibleUniversitySlugs(tx)).not.toContain(target.slug);
      });
      await as(db, users.learner, async (tx) => {
        expect(await visibleUniversitySlugs(tx)).not.toContain(target.slug);
      });
    } finally {
      await db.query(`update public.university_categories set is_active = true where key = $1`, [
        target.category_key,
      ]);
    }
  });
});

describe("write access", () => {
  it("anon cannot write any catalog table", async () => {
    const category = await anyCategoryKey();
    await expect(as(db, "anon", (tx) => insertUniversity(tx, testUniversity(category)))).rejects.toThrow(
      /permission denied/,
    );
    await expect(
      as(db, "anon", (tx) => tx.query(`update public.universities set name_en = 'x'`)),
    ).rejects.toThrow(/permission denied/);
    await expect(as(db, "anon", (tx) => tx.query(`delete from public.subjects`))).rejects.toThrow(
      /permission denied/,
    );
  });

  for (const [label, actor] of [
    ["a public student", users.learner],
    ["a coaching-center admin", users.apexAdmin],
    ["an institution admin", users.northAdmin],
  ] as const) {
    it(`${label} cannot create, edit, deactivate or delete catalog rows`, async () => {
      const category = await anyCategoryKey();
      await expect(as(db, actor, (tx) => insertUniversity(tx, testUniversity(category)))).rejects.toThrow(
        /row-level security/,
      );
      await expect(
        as(db, actor, (tx) =>
          tx.query(
            `insert into public.university_categories (key, name_en, name_bn) values ('zz_cat', 'Zz', 'জেড')`,
          ),
        ),
      ).rejects.toThrow(/row-level security/);

      await as(db, actor, async (tx) => {
        const renamed = await tx.query(`update public.universities set name_en = 'Hijacked'`);
        expect(renamed.affectedRows).toBe(0);
        const deactivated = await tx.query(`update public.exam_targets set is_active = false`);
        expect(deactivated.affectedRows).toBe(0);
        const deleted = await tx.query(`delete from public.subjects`);
        expect(deleted.affectedRows).toBe(0);
      });

      await expect(
        as(db, actor, (tx) => tx.query(`select public.move_catalog_item('university', 'x', 'up')`)),
      ).rejects.toThrow(/not_authorized/);
      await expect(
        as(db, actor, async (tx) => {
          const { rows } = await tx.query<{ id: string }>(`select id from public.exam_targets limit 1`);
          await tx.query(`select public.set_exam_target_subjects($1, '{}')`, [rows[0]!.id]);
        }),
      ).rejects.toThrow(/not_authorized/);
    });
  }

  it("a platform admin can add a university that then appears publicly, with audit entries", async () => {
    const category = await anyCategoryKey();
    const id = await as(db, users.superAdmin, (tx) => insertUniversity(tx, testUniversity(category)), {
      commit: true,
    });

    await as(db, "anon", async (tx) => {
      const { rows } = await tx.query<{ name_bn: string; name_en: string }>(
        `select name_en, name_bn from public.universities where slug = $1`,
        ["zz-test-university"],
      );
      expect(rows).toEqual([{ name_en: "Test University", name_bn: "পরীক্ষামূলক বিশ্ববিদ্যালয়" }]);
    });

    await as(
      db,
      users.superAdmin,
      (tx) => tx.query(`update public.universities set is_active = false where id = $1`, [id]),
      {
        commit: true,
      },
    );
    await as(db, "anon", async (tx) => {
      expect(await visibleUniversitySlugs(tx)).not.toContain("zz-test-university");
    });

    await as(db, users.superAdmin, (tx) => tx.query(`delete from public.universities where id = $1`, [id]), {
      commit: true,
    });

    const audit = await db.query<{ action: string; actor_id: string }>(
      `select action, actor_id from public.audit_logs where target_type = 'university' and target_id = $1 order by id`,
      [id],
    );
    expect(audit.rows).toEqual([
      { action: "university.created", actor_id: users.superAdmin.id },
      { action: "university.deactivated", actor_id: users.superAdmin.id },
      { action: "university.deleted", actor_id: users.superAdmin.id },
    ]);
  });

  it("blocks deleting a university that exam targets reference, and validates slugs", async () => {
    const { rows } = await db.query<{ id: string }>(
      `select university_id as id from public.exam_targets limit 1`,
    );
    await expect(
      as(db, users.superAdmin, (tx) =>
        tx.query(`delete from public.universities where id = $1`, [rows[0]!.id]),
      ),
    ).rejects.toThrow(/foreign key/);

    const category = await anyCategoryKey();
    for (const slug of ["Bad Slug", "-x", "a--b", "x"]) {
      await expect(
        as(db, users.superAdmin, (tx) => insertUniversity(tx, { ...testUniversity(category), slug })),
      ).rejects.toThrow(/check constraint/);
    }
    const existing = await db.query<{ slug: string }>(`select slug from public.universities limit 1`);
    await expect(
      as(db, users.superAdmin, (tx) =>
        insertUniversity(tx, { ...testUniversity(category), slug: existing.rows[0]!.slug }),
      ),
    ).rejects.toThrow(/duplicate key/);
  });

  it("keeps timestamps server-assigned", async () => {
    await expect(
      as(db, users.superAdmin, (tx) =>
        tx.query(`update public.subjects set created_at = now() - interval '1 year'`),
      ),
    ).rejects.toThrow(/permission denied/);
  });

  it("platform admins replace target subjects and reorder rows with single audit entries", async () => {
    const { rows } = await db.query<{ id: string }>(
      `select id from public.exam_targets order by sort_order limit 2`,
    );
    const [first, second] = rows;
    const subjects = await db.query<{ id: string }>(
      `select id from public.subjects order by sort_order limit 2`,
    );

    await as(db, users.superAdmin, async (tx) => {
      await tx.query(`select public.set_exam_target_subjects($1, $2)`, [
        first!.id,
        subjects.rows.map((s) => s.id),
      ]);
      const linked = await tx.query(
        `select subject_id from public.exam_target_subjects where exam_target_id = $1`,
        [first!.id],
      );
      expect(linked.rows).toHaveLength(2);

      await tx.query(`select public.move_catalog_item('exam_target', $1, 'down')`, [first!.id]);
      const order = await tx.query<{ id: string }>(
        `select id from public.exam_targets order by sort_order limit 2`,
      );
      expect(order.rows.map((r) => r.id)).toEqual([second!.id, first!.id]);

      const audit = await tx.query<{ action: string }>(
        `select action from public.audit_logs
          where target_id = $1 and action like 'exam_target.%' and actor_id = $2 order by id`,
        [first!.id, users.superAdmin.id],
      );
      expect(audit.rows.map((r) => r.action)).toEqual([
        "exam_target.subjects_changed",
        "exam_target.reordered",
      ]);
    });
  });
});

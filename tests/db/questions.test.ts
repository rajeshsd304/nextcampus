import type { PGlite, Transaction } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { as, createAuthUser, createTestDatabase, SEED } from "./harness";

const { users, orgs } = SEED;

let db: PGlite;
let publicOrg: string;
let subjectId: string;
let topicId: string;
let otherSubjectTopic: string;

beforeAll(async () => {
  db = await createTestDatabase();
  publicOrg = (await db.query<{ id: string }>(`select id from public.organizations where is_system`)).rows[0]!
    .id;
  // Data-driven: pick any active subject/topic from reference data.
  const topic = await db.query<{ id: string; subject_id: string }>(
    `select id, subject_id from public.topics where is_active order by sort_order, slug limit 1`,
  );
  topicId = topic.rows[0]!.id;
  subjectId = topic.rows[0]!.subject_id;
  otherSubjectTopic = (
    await db.query<{ id: string }>(`select id from public.topics where subject_id <> $1 limit 1`, [subjectId])
  ).rows[0]!.id;
});

afterAll(async () => {
  await db.close();
});

type Payload = Record<string, unknown>;

function mcq(overrides: Payload = {}, mcqOverrides: Payload = {}): Payload {
  return {
    type: "mcq",
    subject_id: subjectId,
    topic_id: topicId,
    difficulty: "easy",
    marks: 1,
    stem_bn: "প্রশ্ন",
    stem_en: "Question",
    mcq: {
      options: [
        { text_bn: "ক", text_en: "A" },
        { text_bn: "খ", text_en: "B" },
        { text_bn: "গ", text_en: "C" },
      ],
      correct_index: 2,
      explanation_bn: "ব্যাখ্যা",
      explanation_en: "Explanation",
      ...mcqOverrides,
    },
    ...overrides,
  };
}

function written(overrides: Payload = {}, writtenOverrides: Payload = {}): Payload {
  return {
    type: "written",
    subject_id: subjectId,
    topic_id: topicId,
    marks: 5,
    stem_bn: "লিখিত প্রশ্ন",
    stem_en: "Written question",
    written: {
      answer_mode: "text",
      word_limit: 100,
      model_answer_bn: "উত্তর",
      model_answer_en: "Answer",
      criteria: [
        { text_bn: "মানদণ্ড ১", text_en: "Criterion 1", max_marks: 3 },
        { text_bn: "মানদণ্ড ২", text_en: "Criterion 2", max_marks: 2 },
      ],
      ...writtenOverrides,
    },
    ...overrides,
  };
}

async function save(tx: Transaction, org: string, payload: Payload, id: string | null = null) {
  const { rows } = await tx.query<{ question_id: string; revision: number; duplicate_ids: string[] }>(
    `select * from public.save_question($1, $2, $3)`,
    [id, org, JSON.stringify(payload)],
  );
  return rows[0]!;
}

async function transition(tx: Transaction, id: string, action: string, reason: string | null = null) {
  return (
    await tx.query<{ status: string }>(`select public.transition_question($1, $2, $3) as status`, [
      id,
      action,
      reason,
    ])
  ).rows[0]!.status;
}

/** Creates a question as `actor` and commits; returns its id. */
async function create(actor: { id: string; email: string }, org: string, payload: Payload): Promise<string> {
  return as(db, actor, async (tx) => (await save(tx, org, payload)).question_id, { commit: true });
}

describe("integrity enforced in the database", () => {
  it("MCQs need 2–6 options and a correct answer among them", async () => {
    await expect(
      as(db, users.northInstructor, (tx) =>
        save(tx, orgs.northbridge, mcq({}, { options: [{ text_bn: "ক", text_en: "A" }], correct_index: 0 })),
      ),
    ).rejects.toThrow(/mcq_option_count/);
    const seven = Array.from({ length: 7 }, (_, i) => ({ text_bn: `${i}`, text_en: `${i}` }));
    await expect(
      as(db, users.northInstructor, (tx) =>
        save(tx, orgs.northbridge, mcq({}, { options: seven, correct_index: 0 })),
      ),
    ).rejects.toThrow(/mcq_option_count/);
    await expect(
      as(db, users.northInstructor, (tx) => save(tx, orgs.northbridge, mcq({}, { correct_index: 5 }))),
    ).rejects.toThrow(/mcq_answer_key_required/);
  });

  it("rejects direct writes that break the rules, even by the table owner", async () => {
    const id = await create(users.northInstructor, orgs.northbridge, mcq());
    // Removing options below two fails at commit.
    await expect(
      db.transaction(async (tx) => {
        await tx.query(`delete from public.question_options where question_id = $1 and label in ('A', 'B')`, [
          id,
        ]);
      }),
    ).rejects.toThrow(/mcq_option_count|answer_key/);
    // An answer key cannot point at another question's option.
    const other = await create(users.northInstructor, orgs.northbridge, mcq({ stem_en: "Other question" }));
    const foreignOption = (
      await db.query<{ id: string }>(
        `select id from public.question_options where question_id = $1 limit 1`,
        [other],
      )
    ).rows[0]!.id;
    await expect(
      db.transaction(async (tx) => {
        await tx.query(`set constraints all immediate`);
        await tx.query(
          `update public.question_answer_keys set correct_option_id = $2 where question_id = $1`,
          [id, foreignOption],
        );
      }),
    ).rejects.toThrow(/foreign key/);
    // Labels must match their position (A–F).
    await expect(
      db.query(`update public.question_options set label = 'Z' where question_id = $1 and label = 'A'`, [id]),
    ).rejects.toThrow(/check constraint/);
  });

  it("written rubric marks must add up to the question marks", async () => {
    await expect(
      as(db, users.northInstructor, (tx) =>
        save(
          tx,
          orgs.northbridge,
          written({}, { criteria: [{ text_bn: "এক", text_en: "One", max_marks: 2 }] }),
        ),
      ),
    ).rejects.toThrow(/rubric_marks_mismatch/);
    const ok = await as(db, users.northInstructor, (tx) => save(tx, orgs.northbridge, written()));
    expect(ok.revision).toBe(1);
  });

  it("topics must belong to the question's subject and type cannot change", async () => {
    await expect(
      as(db, users.northInstructor, (tx) => save(tx, orgs.northbridge, mcq({ topic_id: otherSubjectTopic }))),
    ).rejects.toThrow(/topic_subject_mismatch/);
    const id = await create(users.northInstructor, orgs.northbridge, mcq({ stem_en: "Type change" }));
    await expect(
      as(db, users.northInstructor, (tx) => save(tx, orgs.northbridge, written(), id)),
    ).rejects.toThrow(/question_type_immutable/);
  });
});

describe("authoring permissions", () => {
  it("graders and admins author in their own organization only; students never", async () => {
    await expect(as(db, users.northInstructor, (tx) => save(tx, orgs.apex, mcq()))).rejects.toThrow(
      /not_authorized/,
    );
    await expect(as(db, users.northStudent, (tx) => save(tx, orgs.northbridge, mcq()))).rejects.toThrow(
      /not_authorized/,
    );
    await expect(as(db, users.learner, (tx) => save(tx, publicOrg, mcq()))).rejects.toThrow(/not_authorized/);
    await expect(as(db, users.northAdmin, (tx) => save(tx, publicOrg, mcq()))).rejects.toThrow(
      /not_authorized/,
    );
    await as(db, users.northReviewer, (tx) => save(tx, orgs.northbridge, mcq({ stem_en: "By invigilator" })));
    await as(db, users.superAdmin, (tx) => save(tx, publicOrg, mcq({ stem_en: "Public bank" })));
  });

  it("graders edit only their own drafts; org admins may edit any draft", async () => {
    const id = await create(users.northInstructor, orgs.northbridge, mcq({ stem_en: "Owned by instructor" }));
    await expect(
      as(db, users.northReviewer, (tx) => save(tx, orgs.northbridge, mcq({ stem_en: "Hijack" }), id)),
    ).rejects.toThrow(/not_authorized/);
    const edited = await as(db, users.northAdmin, (tx) =>
      save(tx, orgs.northbridge, mcq({ stem_en: "Edited by admin" }), id),
    );
    expect(edited.revision).toBe(2);
  });

  it("other organizations cannot see or touch a question", async () => {
    const id = await create(
      users.northInstructor,
      orgs.northbridge,
      mcq({ stem_en: "Private to northbridge" }),
    );
    await expect(as(db, users.apexAdmin, (tx) => save(tx, orgs.northbridge, mcq(), id))).rejects.toThrow(
      /question_not_found/,
    );
    await expect(as(db, users.apexAdmin, (tx) => transition(tx, id, "submit"))).rejects.toThrow(
      /question_not_found/,
    );
    await as(db, users.apexAdmin, async (tx) => {
      for (const table of ["questions", "question_revisions"]) {
        const column = table === "questions" ? "id" : "question_id";
        expect(
          (await tx.query(`select 1 from public.${table} where ${column} = $1`, [id])).rows,
          table,
        ).toEqual([]);
      }
      for (const table of ["question_options", "question_answer_keys"]) {
        expect(
          (await tx.query(`select 1 from public.${table} where question_id = $1`, [id])).rows,
          table,
        ).toEqual([]);
      }
    });
  });

  it("API roles cannot write content tables directly", async () => {
    const id = await create(users.northInstructor, orgs.northbridge, mcq({ stem_en: "Direct write" }));
    for (const sql of [
      `update public.questions set status = 'published', published_at = now() where id = '${id}'`,
      `delete from public.question_options where question_id = '${id}'`,
      `update public.question_answer_keys set explanation_en = 'x' where question_id = '${id}'`,
      `insert into public.question_revisions (question_id, revision, change_kind, to_status, snapshot) values ('${id}', 99, 'content', 'draft', '{}')`,
    ]) {
      await expect(as(db, users.northAdmin, (tx) => tx.query(sql))).rejects.toThrow(/permission denied/);
    }
  });
});

describe("workflow", () => {
  it("runs draft → in_review → published for an org-private MCQ, with audit, revisions and notification", async () => {
    const id = await create(users.northInstructor, orgs.northbridge, mcq({ stem_en: "Workflow MCQ" }));
    await as(db, users.northInstructor, (tx) => transition(tx, id, "submit"), { commit: true });
    await expect(
      as(db, users.northInstructor, (tx) => save(tx, orgs.northbridge, mcq(), id)),
    ).rejects.toThrow(/question_not_editable/);
    await expect(as(db, users.northInstructor, (tx) => transition(tx, id, "publish"))).rejects.toThrow(
      /not_authorized/,
    );
    expect(await as(db, users.northAdmin, (tx) => transition(tx, id, "publish"), { commit: true })).toBe(
      "published",
    );

    const q = (
      await db.query<{ status: string; published_at: Date; reviewed_by: string }>(
        `select status, published_at, reviewed_by from public.questions where id = $1`,
        [id],
      )
    ).rows[0]!;
    expect(q).toMatchObject({ status: "published", reviewed_by: users.northAdmin.id });
    expect(q.published_at).toBeInstanceOf(Date);

    const revisions = await db.query<{ revision: number; change_kind: string; to_status: string }>(
      `select revision, change_kind, to_status::text from public.question_revisions where question_id = $1 order by revision`,
      [id],
    );
    expect(revisions.rows).toEqual([
      { revision: 1, change_kind: "created", to_status: "draft" },
      { revision: 2, change_kind: "status", to_status: "in_review" },
      { revision: 3, change_kind: "status", to_status: "published" },
    ]);
    const audit = await db.query<{ action: string }>(
      `select action from public.audit_logs where target_id = $1 order by id`,
      [id],
    );
    expect(audit.rows.map((r) => r.action)).toEqual([
      "question.created",
      "question.submit",
      "question.publish",
    ]);
    const notice = await db.query<{ template: string }>(
      `select template from public.notifications where user_id = $1 and template = 'question_published'`,
      [users.northInstructor.id],
    );
    expect(notice.rows.length).toBeGreaterThan(0);
  });

  it("requires a reason to reject, rejects illegal transitions, and archives/restores", async () => {
    const id = await create(
      users.northInstructor,
      orgs.northbridge,
      written({ stem_en: "Workflow written" }),
    );
    await expect(as(db, users.northAdmin, (tx) => transition(tx, id, "publish"))).rejects.toThrow(
      /invalid_transition/,
    );
    await as(db, users.northInstructor, (tx) => transition(tx, id, "submit"), { commit: true });
    await expect(as(db, users.northAdmin, (tx) => transition(tx, id, "reject", " "))).rejects.toThrow(
      /reason_required/,
    );
    await as(db, users.northAdmin, (tx) => transition(tx, id, "reject", "Please add a diagram."), {
      commit: true,
    });
    const reason = await db.query<{ reason: string }>(
      `select reason from public.question_revisions where question_id = $1 order by revision desc limit 1`,
      [id],
    );
    expect(reason.rows[0]?.reason).toBe("Please add a diagram.");
    await as(db, users.northInstructor, (tx) => transition(tx, id, "submit"), { commit: true });
    await as(db, users.northAdmin, (tx) => transition(tx, id, "publish"), { commit: true });
    await expect(as(db, users.northInstructor, (tx) => transition(tx, id, "archive"))).rejects.toThrow(
      /not_authorized/,
    );
    expect(await as(db, users.northAdmin, (tx) => transition(tx, id, "archive"), { commit: true })).toBe(
      "archived",
    );
    expect(await as(db, users.northAdmin, (tx) => transition(tx, id, "restore"), { commit: true })).toBe(
      "draft",
    );
    await expect(as(db, users.northAdmin, (tx) => transition(tx, id, "teleport"))).rejects.toThrow(
      /invalid_transition/,
    );
  });

  it("enforces the configurable language rules", async () => {
    const empty = await create(
      users.northInstructor,
      orgs.northbridge,
      mcq({ stem_bn: "", stem_en: "", source_note: "empty" }),
    );
    await expect(as(db, users.northInstructor, (tx) => transition(tx, empty, "submit"))).rejects.toThrow(
      /language_incomplete/,
    );

    const bnOnly = await create(
      users.northInstructor,
      orgs.northbridge,
      mcq(
        { stem_en: "" },
        {
          options: [
            { text_bn: "ক", text_en: "" },
            { text_bn: "খ", text_en: "" },
          ],
          correct_index: 0,
          explanation_en: "",
        },
      ),
    );
    const flags = await db.query(`select bn_complete, en_complete from public.questions where id = $1`, [
      bnOnly,
    ]);
    expect(flags.rows[0]).toEqual({ bn_complete: true, en_complete: false });

    await db.query(
      `update public.content_settings set value = '2' where key = 'question_review_min_languages'`,
    );
    try {
      await expect(as(db, users.northInstructor, (tx) => transition(tx, bnOnly, "submit"))).rejects.toThrow(
        /both_languages_required/,
      );
    } finally {
      await db.query(
        `update public.content_settings set value = '1' where key = 'question_review_min_languages'`,
      );
    }
    await as(db, users.northInstructor, (tx) => transition(tx, bnOnly, "submit"));
  });

  it("only platform admins publish to the public bank, and only when both languages are complete", async () => {
    const bnOnly = await create(
      users.superAdmin,
      publicOrg,
      mcq(
        { stem_en: "" },
        {
          options: [
            { text_bn: "ক", text_en: "" },
            { text_bn: "খ", text_en: "" },
          ],
          correct_index: 0,
          explanation_en: "",
        },
      ),
    );
    await as(db, users.superAdmin, (tx) => transition(tx, bnOnly, "submit"), { commit: true });
    await expect(as(db, users.superAdmin, (tx) => transition(tx, bnOnly, "publish"))).rejects.toThrow(
      /both_languages_required/,
    );

    const full = await create(users.superAdmin, publicOrg, mcq({ stem_en: "Public bank full" }));
    await as(db, users.superAdmin, (tx) => transition(tx, full, "submit"), { commit: true });

    // An org admin appointed inside the public organization still cannot publish.
    await db.query(
      `insert into public.organization_members (organization_id, user_id, role) values ($1, $2, 'org_admin')`,
      [publicOrg, users.apexAdmin.id],
    );
    try {
      await expect(as(db, users.apexAdmin, (tx) => transition(tx, full, "publish"))).rejects.toThrow(
        /not_authorized/,
      );
    } finally {
      await db.query(`delete from public.organization_members where organization_id = $1 and user_id = $2`, [
        publicOrg,
        users.apexAdmin.id,
      ]);
    }
    await expect(as(db, users.northAdmin, (tx) => transition(tx, full, "publish"))).rejects.toThrow(
      /question_not_found/,
    );
    expect(await as(db, users.superAdmin, (tx) => transition(tx, full, "publish"))).toBe("published");
  });
});

describe("student visibility", () => {
  let draftId: string;
  let publishedId: string;

  beforeAll(async () => {
    draftId = await create(
      users.northInstructor,
      orgs.northbridge,
      mcq({ stem_en: "Student cannot see draft" }),
    );
    publishedId = await create(
      users.northInstructor,
      orgs.northbridge,
      written({ stem_en: "Published written" }),
    );
    await as(db, users.northInstructor, (tx) => transition(tx, publishedId, "submit"), { commit: true });
    await as(db, users.northAdmin, (tx) => transition(tx, publishedId, "publish"), { commit: true });
  });

  it("students see published content of their own org only, never drafts", async () => {
    await as(db, users.northStudent, async (tx) => {
      expect((await tx.query(`select id from public.questions where id = $1`, [draftId])).rows).toEqual([]);
      expect(
        (await tx.query(`select id from public.question_options where question_id = $1`, [draftId])).rows,
      ).toEqual([]);
      expect(
        (await tx.query(`select id from public.student_questions where id = $1`, [publishedId])).rows,
      ).toHaveLength(1);
      const statuses = await tx.query<{ status: string }>(
        `select distinct status::text from public.questions`,
      );
      expect(statuses.rows.map((r) => r.status)).toEqual(["published"]);
    });
    await as(db, users.apexAdmin, async (tx) => {
      expect(
        (await tx.query(`select id from public.student_questions where id = $1`, [publishedId])).rows,
      ).toEqual([]);
    });
  });

  it("students never read answer keys, model answers, rubrics or revisions — even when published", async () => {
    const seededPublic = (
      await db.query<{ id: string }>(
        `select id from public.questions where owner_org_id = $1 and status = 'published' and type = 'mcq' limit 1`,
        [publicOrg],
      )
    ).rows[0]!.id;
    for (const [student, questionId] of [
      [users.northStudent, publishedId],
      [users.learner, seededPublic],
    ] as const) {
      await as(db, student, async (tx) => {
        expect(
          (await tx.query(`select id from public.student_questions where id = $1`, [questionId])).rows,
        ).toHaveLength(1);
        for (const table of ["question_answer_keys", "model_answers", "rubrics", "question_revisions"]) {
          expect(
            (await tx.query(`select * from public.${table} where question_id = $1`, [questionId])).rows,
            table,
          ).toEqual([]);
        }
        expect((await tx.query(`select * from public.rubric_criteria`)).rows).toEqual([]);
      });
    }
  });

  it("student views structurally contain no answer data", async () => {
    const { rows } = await db.query<{ table_name: string; column_name: string }>(
      `select table_name, column_name from information_schema.columns
       where table_schema = 'public' and table_name like 'student\\_%'`,
    );
    const columns = rows.map((r) => `${r.table_name}.${r.column_name}`);
    expect(columns.length).toBeGreaterThan(10);
    expect(
      columns.filter((c) =>
        /correct|explanation|answer_bn|answer_en|rubric|criteria|status|import_key|created_by/.test(c),
      ),
    ).toEqual([]);
  });

  it("anonymous visitors cannot read questions or student views", async () => {
    for (const relation of [
      "questions",
      "student_questions",
      "student_question_options",
      "question_answer_keys",
    ]) {
      await expect(
        as(db, "anon", (tx) => tx.query(`select 1 from public.${relation} limit 1`)),
      ).rejects.toThrow(/permission denied/);
    }
  });
});

describe("revisions, duplicates, import keys and assets", () => {
  it("revisions are immutable and identical saves add none", async () => {
    const payload = mcq({ stem_en: "Idempotent save" });
    const id = await create(users.northInstructor, orgs.northbridge, payload);
    const again = await as(db, users.northInstructor, (tx) => save(tx, orgs.northbridge, payload, id), {
      commit: true,
    });
    expect(again.revision).toBe(1);
    await expect(
      db.query(`update public.question_revisions set reason = 'x' where question_id = $1`, [id]),
    ).rejects.toThrow(/append_only/);
    await expect(
      db.query(`delete from public.question_revisions where question_id = $1`, [id]),
    ).rejects.toThrow(/append_only/);
  });

  it("warns about duplicates by normalized stem without blocking", async () => {
    const first = await create(
      users.northInstructor,
      orgs.northbridge,
      mcq({ stem_en: "What is the SI unit of force?", stem_bn: "" }),
    );
    const second = await as(
      db,
      users.northInstructor,
      (tx) => save(tx, orgs.northbridge, mcq({ stem_en: "  what is the si unit of FORCE ", stem_bn: "" })),
      { commit: true },
    );
    expect(second.duplicate_ids).toContain(first);
    await as(db, users.northInstructor, async (tx) => {
      const { rows } = await tx.query<{ question_id: string }>(
        `select * from public.find_duplicate_questions($1, null, $2)`,
        [orgs.northbridge, "What is the SI unit of force"],
      );
      expect(rows.map((r) => r.question_id)).toEqual(expect.arrayContaining([first, second.question_id]));
    });
    await as(db, users.apexAdmin, async (tx) => {
      const { rows } = await tx.query(`select * from public.find_duplicate_questions($1, null, $2)`, [
        orgs.northbridge,
        "What is the SI unit of force",
      ]);
      expect(rows).toEqual([]);
    });
  });

  it("import keys are unique per organization", async () => {
    await create(users.northInstructor, orgs.northbridge, mcq({ import_key: "row-42" }));
    await expect(
      as(db, users.northInstructor, (tx) => save(tx, orgs.northbridge, mcq({ import_key: "row-42" }))),
    ).rejects.toThrow(/import_key_taken/);
    await create(users.apexAdmin, orgs.apex, mcq({ import_key: "row-42" }));
  });

  it("uploads go only to editable drafts of the uploader's org, and assets need a stored object", async () => {
    const id = await create(users.northInstructor, orgs.northbridge, mcq({ stem_en: "With image" }));
    const path = `${orgs.northbridge}/${id}/11111111-1111-4111-8111-111111111111.png`;
    const insertObject = (tx: Transaction, objectPath: string) =>
      tx.query(
        `insert into storage.objects (bucket_id, name, metadata) values ('question-assets', $1, '{"mimetype":"image/png","size":1024}')`,
        [objectPath],
      );

    await expect(as(db, users.apexAdmin, (tx) => insertObject(tx, path))).rejects.toThrow(
      /row-level security/,
    );
    await expect(as(db, users.northStudent, (tx) => insertObject(tx, path))).rejects.toThrow(
      /row-level security/,
    );
    await expect(
      as(db, users.northInstructor, (tx) =>
        tx.query(`select public.add_question_asset($1, $2, '', '')`, [id, path]),
      ),
    ).rejects.toThrow(/asset_not_uploaded/);

    await as(
      db,
      users.northInstructor,
      async (tx) => {
        await insertObject(tx, path);
        await tx.query(`select public.add_question_asset($1, $2, 'চিত্র', 'Figure')`, [id, path]);
      },
      { commit: true },
    );
    const asset = await db.query(
      `select mime_type, size_bytes from public.question_assets where question_id = $1`,
      [id],
    );
    expect(asset.rows).toEqual([{ mime_type: "image/png", size_bytes: 1024 }]);

    await as(db, users.northStudent, async (tx) => {
      expect((await tx.query(`select 1 from storage.objects where name = $1`, [path])).rows).toEqual([]);
      expect(
        (await tx.query(`select 1 from public.question_assets where question_id = $1`, [id])).rows,
      ).toEqual([]);
    });
    await expect(
      as(db, users.northInstructor, (tx) =>
        tx.query(`select public.add_question_asset($1, $2, '', '')`, [
          id,
          `${orgs.apex}/${id}/22222222-2222-4222-8222-222222222222.png`,
        ]),
      ),
    ).rejects.toThrow(/invalid_asset_path/);
  });
});

describe("topics", () => {
  it("are public reference data writable only by platform admins, with a valid tree", async () => {
    await as(db, "anon", async (tx) => {
      expect((await tx.query(`select id from public.topics limit 1`)).rows).toHaveLength(1);
    });
    await expect(
      as(db, users.northAdmin, (tx) =>
        tx.query(
          `insert into public.topics (subject_id, slug, name_en, name_bn) values ($1, 'zz-topic', 'Zz', 'জেড')`,
          [subjectId],
        ),
      ),
    ).rejects.toThrow(/row-level security/);
    await expect(
      as(db, users.superAdmin, (tx) =>
        tx.query(
          `insert into public.topics (subject_id, parent_id, slug, name_en, name_bn) values ($1, $2, 'zz-child', 'Zz', 'জেড')`,
          [subjectId, otherSubjectTopic],
        ),
      ),
    ).rejects.toThrow(/topic_parent_subject_mismatch/);
    await expect(
      as(db, users.superAdmin, (tx) =>
        tx.query(`update public.topics set created_at = now() where id = $1`, [topicId]),
      ),
    ).rejects.toThrow(/permission denied/);
  });
});

describe("new users still work", () => {
  it("a brand-new grader added to an org can author immediately", async () => {
    const grader = await createAuthUser(db, {
      id: "60000000-0000-4000-8000-000000000001",
      email: "grader@example.com",
    });
    await db.query(
      `insert into public.organization_members (organization_id, user_id, role) values ($1, $2, 'instructor')`,
      [orgs.apex, grader.id],
    );
    const saved = await as(db, grader, (tx) => save(tx, orgs.apex, mcq({ stem_en: "New grader" })));
    expect(saved.revision).toBe(1);
  });
});

import { readFileSync } from "node:fs";
import Papa from "papaparse";
import { describe, expect, it } from "vitest";
import { IMPORT_MAX_ROWS } from "@/features/questions/constants";
import { IMPORT_COLUMNS, parseImportCsv, type ImportLookups } from "@/features/questions/import/csv";
import {
  emptyQuestionForm,
  questionFormSchema,
  toSavePayload,
  type QuestionFormInput,
} from "@/features/questions/schemas";
import { filtersToQuery, parseQuestionFilters } from "@/features/questions/server/filters";
import { decodeCursor, encodeCursor } from "@/features/questions/server/queries";

// Synthetic ids/slugs: tests never rely on real subject, topic or exam names.
const SUBJECT = "10000000-0000-4000-8000-0000000000a1";
const OTHER_SUBJECT = "10000000-0000-4000-8000-0000000000a2";
const TOPIC = "20000000-0000-4000-8000-0000000000b1";
const OTHER_TOPIC = "20000000-0000-4000-8000-0000000000b2";
const TARGET = "30000000-0000-4000-8000-0000000000c1";

const lookups: ImportLookups = {
  subjects: new Map([
    ["subject-x", SUBJECT],
    ["subject-y", OTHER_SUBJECT],
  ]),
  topics: new Map([
    ["topic-x", { id: TOPIC, subjectId: SUBJECT }],
    ["topic-y", { id: OTHER_TOPIC, subjectId: OTHER_SUBJECT }],
  ]),
  examTargets: new Map([["target-x", TARGET]]),
};

function mcqForm(overrides: Partial<QuestionFormInput> = {}): QuestionFormInput {
  return {
    ...emptyQuestionForm("mcq", { subjectId: SUBJECT, topicId: TOPIC }),
    stemEn: "What is $1+1$?",
    options: [
      { textBn: "১", textEn: "1" },
      { textBn: "২", textEn: "2" },
    ],
    correctIndex: 1,
    ...overrides,
  };
}

function writtenForm(overrides: Partial<QuestionFormInput> = {}): QuestionFormInput {
  return {
    ...emptyQuestionForm("written", { subjectId: SUBJECT, topicId: TOPIC }),
    stemBn: "ব্যাখ্যা করো।",
    ...overrides,
  };
}

describe("question form schema", () => {
  it("accepts a valid MCQ and written question", () => {
    expect(questionFormSchema.safeParse(mcqForm()).success).toBe(true);
    expect(questionFormSchema.safeParse(writtenForm()).success).toBe(true);
  });

  it("requires a stem in at least one language", () => {
    const result = questionFormSchema.safeParse(mcqForm({ stemEn: "", stemBn: "  " }));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.message).toBe("validation.stemRequired");
  });

  it("enforces 2–6 MCQ options and a correct option in range", () => {
    expect(
      questionFormSchema.safeParse(mcqForm({ options: [{ textBn: "", textEn: "1" }], correctIndex: 0 }))
        .success,
    ).toBe(false);
    const seven = Array.from({ length: 7 }, () => ({ textBn: "", textEn: "x" }));
    expect(questionFormSchema.safeParse(mcqForm({ options: seven })).success).toBe(false);
    expect(questionFormSchema.safeParse(mcqForm({ correctIndex: 2 })).success).toBe(false);
  });

  it("requires rubric marks to add up to the question marks (two-decimal safe)", () => {
    const criteria = [
      { textBn: "", textEn: "a", maxMarks: 0.1 },
      { textBn: "", textEn: "b", maxMarks: 0.2 },
    ];
    expect(questionFormSchema.safeParse(writtenForm({ marks: 0.3, criteria })).success).toBe(true);
    expect(questionFormSchema.safeParse(writtenForm({ marks: 1, criteria })).success).toBe(false);
  });

  it("rejects out-of-range marks and limits", () => {
    expect(questionFormSchema.safeParse(mcqForm({ marks: 0 })).success).toBe(false);
    expect(questionFormSchema.safeParse(mcqForm({ marks: 101 })).success).toBe(false);
    expect(questionFormSchema.safeParse(mcqForm({ marks: 1.005 })).success).toBe(false);
    expect(questionFormSchema.safeParse(writtenForm({ wordLimit: 0 })).success).toBe(false);
  });

  it("maps form values to the RPC payload per type", () => {
    const mcq = toSavePayload(questionFormSchema.parse(mcqForm()), "row-1");
    expect(mcq).toMatchObject({
      type: "mcq",
      import_key: "row-1",
      mcq: { correct_index: 1 },
      exam_target_id: null,
    });
    expect(mcq).not.toHaveProperty("written");
    const written = toSavePayload(questionFormSchema.parse(writtenForm({ wordLimit: "" })));
    expect(written).toMatchObject({
      type: "written",
      written: { word_limit: null, criteria: [{ max_marks: 5 }] },
    });
    expect(written).not.toHaveProperty("mcq");
  });
});

function csv(rows: Record<string, string>[]): string {
  return Papa.unparse({
    fields: [...IMPORT_COLUMNS],
    data: rows.map((r) => IMPORT_COLUMNS.map((c) => r[c] ?? "")),
  });
}

const mcqRow = {
  external_id: "q-1",
  type: "mcq",
  subject: "subject-x",
  topic: "topic-x",
  exam_target: "target-x",
  difficulty: "hard",
  marks: "1",
  stem_bn: "প্রশ্ন",
  stem_en: "Question",
  option_a_bn: "ক",
  option_a_en: "A",
  option_b_bn: "খ",
  option_b_en: "B",
  correct_option: "b",
  explanation_en: "Because.",
};

const writtenRow = {
  external_id: "q-2",
  type: "written",
  subject: "subject-x",
  topic: "topic-x",
  marks: "5",
  stem_en: "Explain.",
  answer_mode: "both",
  word_limit: "120",
  model_answer_en: "Model.",
  criterion_1_en: "Idea",
  criterion_1_marks: "3",
  criterion_2_en: "Example",
  criterion_2_marks: "2",
};

describe("CSV import", () => {
  it("the downloadable template matches the parser's columns", () => {
    const template = readFileSync("public/templates/question-import-template.csv", "utf8").replace(/^﻿/, "");
    const header = template.split("\n")[0]!.split(",");
    expect(header).toEqual([...IMPORT_COLUMNS]);
  });

  it("parses valid MCQ and written rows, resolving slugs to ids", () => {
    const result = parseImportCsv(csv([mcqRow, writtenRow]), lookups);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const [mcq, written] = result.rows;
    expect(mcq).toMatchObject({
      row: 2,
      ok: true,
      values: {
        subjectId: SUBJECT,
        topicId: TOPIC,
        examTargetId: TARGET,
        correctIndex: 1,
        difficulty: "hard",
      },
    });
    expect(written).toMatchObject({
      row: 3,
      ok: true,
      values: { answerMode: "both", wordLimit: 120, criteria: [{ maxMarks: 3 }, { maxMarks: 2 }] },
    });
  });

  it("reports per-row errors with the offending column", () => {
    const result = parseImportCsv(
      csv([
        { ...mcqRow, subject: "nope" },
        { ...mcqRow, external_id: "q-3", topic: "topic-y" },
        { ...mcqRow, external_id: "q-4", correct_option: "Z" },
        { ...writtenRow, external_id: "q-5", criterion_2_marks: "1" },
        { ...mcqRow, external_id: "bad id!" },
        { ...mcqRow, type: "essay", external_id: "q-6" },
      ]),
      lookups,
    );
    if (!result.ok) throw new Error("expected rows");
    const issues = result.rows.map((r) => (r.ok ? [] : r.issues.map((i) => `${i.column}:${i.code}`)));
    expect(issues[0]).toContain("subject:questionImport.issues.subjectUnknown");
    expect(issues[1]).toContain("topic:questionImport.issues.topicSubjectMismatch");
    expect(issues[2]).toContain("correct_option:questionImport.issues.correctOptionInvalid");
    expect(issues[3]).toContain("criteria:validation.rubricTotal");
    expect(issues[4]).toContain("external_id:questionImport.issues.externalIdInvalid");
    expect(issues[5]).toContain("type:questionImport.issues.typeInvalid");
  });

  it("flags repeated external ids within a file", () => {
    const result = parseImportCsv(csv([mcqRow, mcqRow]), lookups);
    if (!result.ok) throw new Error("expected rows");
    expect(result.rows[1]).toMatchObject({
      ok: false,
      issues: [{ code: "questionImport.issues.externalIdRepeated" }],
    });
  });

  it("rejects files that are empty, too large, too long or missing columns", () => {
    expect(parseImportCsv("external_id,type\n", lookups)).toMatchObject({ ok: false });
    expect(parseImportCsv(csv([]), lookups)).toEqual({
      ok: false,
      issue: { code: "questionImport.issues.empty" },
    });
    expect(parseImportCsv("x".repeat(1024 * 1024 + 1), lookups)).toEqual({
      ok: false,
      issue: { code: "questionImport.issues.fileTooLarge" },
    });
    const many = Array.from({ length: IMPORT_MAX_ROWS + 1 }, (_, i) => ({
      ...mcqRow,
      external_id: `q-${i}`,
    }));
    expect(parseImportCsv(csv(many), lookups)).toEqual({
      ok: false,
      issue: { code: "questionImport.issues.tooManyRows" },
    });
  });

  it("treats spreadsheet-injection text as plain content", () => {
    const result = parseImportCsv(
      csv([{ ...mcqRow, stem_en: '=HYPERLINK("http://evil")<script>' }]),
      lookups,
    );
    if (!result.ok || !result.rows[0]?.ok) throw new Error("expected a valid row");
    expect(result.rows[0].values.stemEn).toBe('=HYPERLINK("http://evil")<script>');
  });
});

describe("list cursors and filters", () => {
  it("round-trips keyset cursors and rejects tampered ones", () => {
    const item = {
      updated_at: "2026-10-31T10:00:00.123456+00:00",
      id: "40000000-0000-4000-8000-000000000001",
    };
    expect(decodeCursor(encodeCursor(item))).toEqual({ updatedAt: item.updated_at, id: item.id });
    expect(decodeCursor("not-base64-at-all")).toBeNull();
    expect(decodeCursor(Buffer.from("2026-10-31|'; drop table").toString("base64url"))).toBeNull();
    expect(decodeCursor(undefined)).toBeNull();
  });

  it("parses filters leniently and serializes them back", () => {
    const filters = parseQuestionFilters({
      subject: SUBJECT,
      type: "mcq",
      status: "bogus",
      language: "both",
      difficulty: ["hard", "easy"],
    });
    expect(filters).toEqual({ subject: SUBJECT, type: "mcq", language: "both", difficulty: "hard" });
    const query = new URLSearchParams(filtersToQuery(filters, { cursor: "abc" }).slice(1));
    expect(Object.fromEntries(query)).toEqual({
      subject: SUBJECT,
      type: "mcq",
      language: "both",
      difficulty: "hard",
      cursor: "abc",
    });
    expect(filtersToQuery({})).toBe("");
  });
});

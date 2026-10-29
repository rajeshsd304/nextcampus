import Papa from "papaparse";
import {
  IMPORT_MAX_BYTES,
  IMPORT_MAX_ROWS,
  MCQ_MAX_OPTIONS,
  QUESTION_DIFFICULTIES,
  QUESTION_TYPES,
  WRITTEN_ANSWER_MODES,
} from "../constants";
import { questionFormSchema, type QuestionFormInput, type QuestionFormValues } from "../schemas";

/**
 * CSV import template (one row per question; see public/templates/question-import-template.csv
 * and README › Question bank › CSV import). Subjects, topics and exam targets are referenced
 * by slug so files never depend on database ids.
 */
export const OPTION_LETTERS = ["a", "b", "c", "d", "e", "f"] as const;
export const MAX_IMPORT_CRITERIA = 6;

export const IMPORT_COLUMNS = [
  "external_id",
  "type",
  "subject",
  "topic",
  "exam_target",
  "difficulty",
  "marks",
  "stem_bn",
  "stem_en",
  ...OPTION_LETTERS.flatMap((l) => [`option_${l}_bn`, `option_${l}_en`]),
  "correct_option",
  "explanation_bn",
  "explanation_en",
  "answer_mode",
  "word_limit",
  "char_limit",
  "model_answer_bn",
  "model_answer_en",
  ...Array.from({ length: MAX_IMPORT_CRITERIA }, (_, i) => [
    `criterion_${i + 1}_bn`,
    `criterion_${i + 1}_en`,
    `criterion_${i + 1}_marks`,
  ]).flat(),
  "source_note",
] as const;

export const REQUIRED_COLUMNS = ["external_id", "type", "subject", "topic", "marks"] as const;

export type ImportIssue = { code: string; column?: string };

export type ImportLookups = {
  subjects: Map<string, string>;
  /** topic slug → { id, subjectId } */
  topics: Map<string, { id: string; subjectId: string }>;
  examTargets: Map<string, string>;
};

export type ParsedRow =
  | { row: number; externalId: string; ok: true; values: QuestionFormValues }
  | { row: number; externalId: string; ok: false; issues: ImportIssue[] };

export type ParseResult = { ok: true; rows: ParsedRow[] } | { ok: false; issue: ImportIssue };

function cell(record: Record<string, string>, column: string): string {
  return (record[column] ?? "").trim();
}

function numberOrBlank(value: string): number | "" | typeof Number.NaN {
  if (!value) return "";
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

/** Maps a Zod issue path on the form schema back to the CSV column it came from. */
export function columnForPath(path: readonly PropertyKey[]): string | undefined {
  const [head, index, field] = path;
  const simple: Record<string, string> = {
    type: "type",
    subjectId: "subject",
    topicId: "topic",
    examTargetId: "exam_target",
    difficulty: "difficulty",
    marks: "marks",
    stemBn: "stem_bn",
    stemEn: "stem_en",
    sourceNote: "source_note",
    correctIndex: "correct_option",
    explanationBn: "explanation_bn",
    explanationEn: "explanation_en",
    answerMode: "answer_mode",
    wordLimit: "word_limit",
    charLimit: "char_limit",
    modelAnswerBn: "model_answer_bn",
    modelAnswerEn: "model_answer_en",
  };
  if (typeof head === "string" && head in simple) return simple[head];
  if (head === "options" && typeof index === "number") {
    const letter = OPTION_LETTERS[index];
    return letter ? `option_${letter}_${field === "textEn" ? "en" : "bn"}` : "options";
  }
  if (head === "criteria" && typeof index === "number") {
    return `criterion_${index + 1}_${field === "maxMarks" ? "marks" : field === "textEn" ? "en" : "bn"}`;
  }
  return typeof head === "string" ? head : undefined;
}

/** Validates one CSV record and resolves slugs. Pure: no database access. */
export function parseRecord(record: Record<string, string>, row: number, lookups: ImportLookups): ParsedRow {
  const externalId = cell(record, "external_id");
  const issues: ImportIssue[] = [];

  if (!/^[A-Za-z0-9._:-]{1,100}$/.test(externalId))
    issues.push({ code: "questionImport.issues.externalIdInvalid", column: "external_id" });

  const type = cell(record, "type").toLowerCase();
  if (!(QUESTION_TYPES as readonly string[]).includes(type))
    issues.push({ code: "questionImport.issues.typeInvalid", column: "type" });

  const subjectId = lookups.subjects.get(cell(record, "subject"));
  if (!subjectId) issues.push({ code: "questionImport.issues.subjectUnknown", column: "subject" });

  const topic = lookups.topics.get(cell(record, "topic"));
  if (!topic) issues.push({ code: "questionImport.issues.topicUnknown", column: "topic" });
  else if (subjectId && topic.subjectId !== subjectId)
    issues.push({ code: "questionImport.issues.topicSubjectMismatch", column: "topic" });

  const examTargetSlug = cell(record, "exam_target");
  const examTargetId = examTargetSlug ? lookups.examTargets.get(examTargetSlug) : "";
  if (examTargetSlug && !examTargetId)
    issues.push({ code: "questionImport.issues.examTargetUnknown", column: "exam_target" });

  const difficulty = cell(record, "difficulty").toLowerCase() || "medium";
  if (!(QUESTION_DIFFICULTIES as readonly string[]).includes(difficulty))
    issues.push({ code: "questionImport.issues.difficultyInvalid", column: "difficulty" });

  const answerMode = cell(record, "answer_mode").toLowerCase() || "text";
  if (type === "written" && !(WRITTEN_ANSWER_MODES as readonly string[]).includes(answerMode)) {
    issues.push({ code: "questionImport.issues.answerModeInvalid", column: "answer_mode" });
  }

  if (issues.length > 0) return { row, externalId, ok: false, issues };

  const options: QuestionFormInput["options"] = [];
  if (type === "mcq") {
    for (const letter of OPTION_LETTERS.slice(0, MCQ_MAX_OPTIONS)) {
      const textBn = cell(record, `option_${letter}_bn`);
      const textEn = cell(record, `option_${letter}_en`);
      if (textBn || textEn) options.push({ textBn, textEn });
    }
  }
  const correct = cell(record, "correct_option").toLowerCase();
  const correctIndex = (OPTION_LETTERS as readonly string[]).indexOf(correct);
  if (type === "mcq" && correctIndex < 0) {
    return {
      row,
      externalId,
      ok: false,
      issues: [{ code: "questionImport.issues.correctOptionInvalid", column: "correct_option" }],
    };
  }

  const criteria: QuestionFormInput["criteria"] = [];
  if (type === "written") {
    for (let i = 1; i <= MAX_IMPORT_CRITERIA; i++) {
      const textBn = cell(record, `criterion_${i}_bn`);
      const textEn = cell(record, `criterion_${i}_en`);
      const maxMarks = cell(record, `criterion_${i}_marks`);
      if (textBn || textEn || maxMarks) criteria.push({ textBn, textEn, maxMarks: Number(maxMarks) });
    }
  }

  const input: QuestionFormInput = {
    type: type as QuestionFormInput["type"],
    subjectId: subjectId ?? "",
    topicId: topic?.id ?? "",
    examTargetId: examTargetId ?? "",
    difficulty: difficulty as QuestionFormInput["difficulty"],
    marks: Number(cell(record, "marks")),
    stemBn: cell(record, "stem_bn"),
    stemEn: cell(record, "stem_en"),
    sourceNote: cell(record, "source_note"),
    options,
    correctIndex: Math.max(0, correctIndex),
    explanationBn: cell(record, "explanation_bn"),
    explanationEn: cell(record, "explanation_en"),
    answerMode: answerMode as QuestionFormInput["answerMode"],
    wordLimit: numberOrBlank(cell(record, "word_limit")),
    charLimit: numberOrBlank(cell(record, "char_limit")),
    modelAnswerBn: cell(record, "model_answer_bn"),
    modelAnswerEn: cell(record, "model_answer_en"),
    guidanceBn: "",
    guidanceEn: "",
    criteria,
  };

  const parsed = questionFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      row,
      externalId,
      ok: false,
      issues: parsed.error.issues.map((issue) => ({
        code: issue.message,
        column: columnForPath(issue.path),
      })),
    };
  }
  return { row, externalId, ok: true, values: parsed.data };
}

/** Parses and validates a whole CSV file. Rows are numbered as in a spreadsheet (header = 1). */
export function parseImportCsv(content: string, lookups: ImportLookups): ParseResult {
  if (new TextEncoder().encode(content).byteLength > IMPORT_MAX_BYTES)
    return { ok: false, issue: { code: "questionImport.issues.fileTooLarge" } };

  const result = Papa.parse<Record<string, string>>(content.replace(/^﻿/, ""), {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (header) => header.trim().toLowerCase(),
  });
  const fatal = result.errors.find((e) => e.type === "Quotes" || e.type === "Delimiter");
  if (fatal) return { ok: false, issue: { code: "questionImport.issues.malformed" } };

  const headers = result.meta.fields ?? [];
  const missing = REQUIRED_COLUMNS.filter((c) => !headers.includes(c));
  if (missing.length > 0)
    return { ok: false, issue: { code: "questionImport.issues.missingColumns", column: missing.join(", ") } };
  if (result.data.length === 0) return { ok: false, issue: { code: "questionImport.issues.empty" } };
  if (result.data.length > IMPORT_MAX_ROWS)
    return { ok: false, issue: { code: "questionImport.issues.tooManyRows" } };

  const seen = new Set<string>();
  const rows = result.data.map((record, index): ParsedRow => {
    const parsed = parseRecord(record, index + 2, lookups);
    if (parsed.externalId && seen.has(parsed.externalId)) {
      return {
        row: parsed.row,
        externalId: parsed.externalId,
        ok: false,
        issues: [{ code: "questionImport.issues.externalIdRepeated", column: "external_id" }],
      };
    }
    seen.add(parsed.externalId);
    return parsed;
  });
  return { ok: true, rows };
}

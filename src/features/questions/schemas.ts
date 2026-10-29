import { z } from "zod";
import type { Json } from "@/types/database";
import {
  MAX_RUBRIC_CRITERIA,
  MCQ_MAX_OPTIONS,
  MCQ_MIN_OPTIONS,
  QUESTION_ACTIONS,
  QUESTION_DIFFICULTIES,
  QUESTION_TYPES,
  WRITTEN_ANSWER_MODES,
} from "./constants";

// Issue messages are translation keys (messages/<locale>.json → validation.*).

const text = (max: number) => z.string().max(max, "validation.textTooLong");
const marks = z
  .number("validation.marksInvalid")
  .positive("validation.marksInvalid")
  .max(100, "validation.marksInvalid")
  .refine((value) => Math.round(value * 100) === value * 100, "validation.marksInvalid");
const optionalLimit = (max: number) =>
  z.union([
    z.literal(""),
    z
      .number()
      .int("validation.limitInvalid")
      .min(1, "validation.limitInvalid")
      .max(max, "validation.limitInvalid"),
  ]);

const optionSchema = z.object({ textBn: text(2000), textEn: text(2000) });
const criterionSchema = z.object({ textBn: text(1000), textEn: text(1000), maxMarks: marks });

/**
 * Editor form values. One schema for both types (RHF-friendly); type-specific
 * rules are applied in superRefine. The database re-checks everything.
 */
export const questionFormSchema = z
  .object({
    type: z.enum(QUESTION_TYPES),
    subjectId: z.uuid("validation.subjectRequired"),
    topicId: z.uuid("validation.topicRequired"),
    examTargetId: z.union([z.literal(""), z.uuid()]),
    difficulty: z.enum(QUESTION_DIFFICULTIES),
    marks,
    stemBn: text(5000),
    stemEn: text(5000),
    sourceNote: text(500),
    options: z.array(optionSchema).max(MCQ_MAX_OPTIONS, "validation.optionCount"),
    correctIndex: z.number().int().min(0),
    explanationBn: text(5000),
    explanationEn: text(5000),
    answerMode: z.enum(WRITTEN_ANSWER_MODES),
    wordLimit: optionalLimit(5000),
    charLimit: optionalLimit(50000),
    modelAnswerBn: text(10000),
    modelAnswerEn: text(10000),
    guidanceBn: text(2000),
    guidanceEn: text(2000),
    criteria: z.array(criterionSchema).max(MAX_RUBRIC_CRITERIA, "validation.criteriaCount"),
  })
  .superRefine((value, ctx) => {
    if (!value.stemBn.trim() && !value.stemEn.trim()) {
      ctx.addIssue({ code: "custom", path: ["stemBn"], message: "validation.stemRequired" });
    }
    if (value.type === "mcq") {
      if (value.options.length < MCQ_MIN_OPTIONS) {
        ctx.addIssue({ code: "custom", path: ["options"], message: "validation.optionCount" });
      }
      if (value.correctIndex >= value.options.length) {
        ctx.addIssue({ code: "custom", path: ["correctIndex"], message: "validation.correctOptionRequired" });
      }
    } else if (value.criteria.length > 0) {
      const total = value.criteria.reduce((sum, c) => sum + Math.round(c.maxMarks * 100), 0);
      if (total !== Math.round(value.marks * 100)) {
        ctx.addIssue({ code: "custom", path: ["criteria"], message: "validation.rubricTotal" });
      }
    }
  });

export type QuestionFormInput = z.input<typeof questionFormSchema>;
export type QuestionFormValues = z.output<typeof questionFormSchema>;

/** Converts editor values into the JSON payload accepted by public.save_question(). */
export function toSavePayload(values: QuestionFormValues, importKey?: string): Json {
  const base = {
    type: values.type,
    subject_id: values.subjectId,
    topic_id: values.topicId,
    exam_target_id: values.examTargetId || null,
    difficulty: values.difficulty,
    marks: values.marks,
    stem_bn: values.stemBn,
    stem_en: values.stemEn,
    source_note: values.sourceNote,
    ...(importKey ? { import_key: importKey } : {}),
  };
  if (values.type === "mcq") {
    return {
      ...base,
      mcq: {
        options: values.options.map((o) => ({ text_bn: o.textBn, text_en: o.textEn })),
        correct_index: values.correctIndex,
        explanation_bn: values.explanationBn,
        explanation_en: values.explanationEn,
      },
    };
  }
  return {
    ...base,
    written: {
      answer_mode: values.answerMode,
      word_limit: values.wordLimit === "" ? null : values.wordLimit,
      char_limit: values.charLimit === "" ? null : values.charLimit,
      model_answer_bn: values.modelAnswerBn,
      model_answer_en: values.modelAnswerEn,
      guidance_bn: values.guidanceBn,
      guidance_en: values.guidanceEn,
      criteria: values.criteria.map((c) => ({ text_bn: c.textBn, text_en: c.textEn, max_marks: c.maxMarks })),
    },
  };
}

export function emptyQuestionForm(
  type: QuestionFormInput["type"],
  defaults: { subjectId: string; topicId: string },
): QuestionFormInput {
  return {
    type,
    subjectId: defaults.subjectId,
    topicId: defaults.topicId,
    examTargetId: "",
    difficulty: "medium",
    marks: type === "mcq" ? 1 : 5,
    stemBn: "",
    stemEn: "",
    sourceNote: "",
    options: type === "mcq" ? Array.from({ length: 4 }, () => ({ textBn: "", textEn: "" })) : [],
    correctIndex: 0,
    explanationBn: "",
    explanationEn: "",
    answerMode: "text",
    wordLimit: "",
    charLimit: "",
    modelAnswerBn: "",
    modelAnswerEn: "",
    guidanceBn: "",
    guidanceEn: "",
    criteria: type === "written" ? [{ textBn: "", textEn: "", maxMarks: 5 }] : [],
  };
}

export const saveQuestionSchema = z.object({
  bank: z.object({ kind: z.enum(["org", "platform"]), slug: z.string().max(48).optional() }),
  questionId: z.uuid().optional(),
  values: questionFormSchema,
});

export const transitionSchema = z
  .object({
    bank: z.object({ kind: z.enum(["org", "platform"]), slug: z.string().max(48).optional() }),
    questionId: z.uuid(),
    action: z.enum(QUESTION_ACTIONS),
    reason: z.string().trim().max(1000, "validation.textTooLong"),
  })
  .superRefine((value, ctx) => {
    if (value.action === "reject" && value.reason.length < 3) {
      ctx.addIssue({ code: "custom", path: ["reason"], message: "validation.reasonRequired" });
    }
  });

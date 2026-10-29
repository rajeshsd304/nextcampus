import type { Enums } from "@/types/database";

export type QuestionType = Enums<"question_type">;
export type QuestionStatus = Enums<"question_status">;
export type QuestionDifficulty = Enums<"question_difficulty">;
export type WrittenAnswerMode = Enums<"written_answer_mode">;

/** Labels: messages `questions.types.*`, `questions.statuses.*`, … */
export const QUESTION_TYPES = ["mcq", "written"] as const satisfies readonly QuestionType[];
export const QUESTION_STATUSES = [
  "draft",
  "in_review",
  "published",
  "archived",
] as const satisfies readonly QuestionStatus[];
export const QUESTION_DIFFICULTIES = [
  "easy",
  "medium",
  "hard",
] as const satisfies readonly QuestionDifficulty[];
export const WRITTEN_ANSWER_MODES = ["text", "image", "both"] as const satisfies readonly WrittenAnswerMode[];
export const LANGUAGE_FILTERS = ["both", "bn", "en", "incomplete"] as const;
export type LanguageFilter = (typeof LANGUAGE_FILTERS)[number];

export const MCQ_MIN_OPTIONS = 2;
export const MCQ_MAX_OPTIONS = 6;
export const MAX_RUBRIC_CRITERIA = 20;

/** Actions accepted by public.transition_question(). */
export const QUESTION_ACTIONS = ["submit", "withdraw", "reject", "publish", "archive", "restore"] as const;
export type QuestionAction = (typeof QUESTION_ACTIONS)[number];

/** Mirrors the state machine in public.transition_question() (for showing buttons only). */
export const ACTION_FROM: Record<QuestionAction, QuestionStatus> = {
  submit: "draft",
  withdraw: "in_review",
  reject: "in_review",
  publish: "in_review",
  archive: "published",
  restore: "archived",
};

export const ASSET_BUCKET = "question-assets";
export const ASSET_MIME_TYPES = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" } as const;
export type AssetMimeType = keyof typeof ASSET_MIME_TYPES;
export const ASSET_MAX_BYTES = 2 * 1024 * 1024;

export const IMPORT_MAX_BYTES = 1024 * 1024;
export const IMPORT_MAX_ROWS = 500;

import "server-only";
import { z } from "zod";
import { LANGUAGE_FILTERS, QUESTION_DIFFICULTIES, QUESTION_STATUSES, QUESTION_TYPES } from "../constants";
import type { QuestionFilters } from "./queries";

const filterSchema = z.object({
  subject: z.uuid().optional().catch(undefined),
  topic: z.uuid().optional().catch(undefined),
  examTarget: z.uuid().optional().catch(undefined),
  type: z.enum(QUESTION_TYPES).optional().catch(undefined),
  difficulty: z.enum(QUESTION_DIFFICULTIES).optional().catch(undefined),
  status: z.enum(QUESTION_STATUSES).optional().catch(undefined),
  language: z.enum(LANGUAGE_FILTERS).optional().catch(undefined),
});

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  const v = Array.isArray(value) ? value[0] : value;
  return v ? v : undefined;
}

/** Parses list filters from the URL; invalid values are ignored rather than erroring. */
export function parseQuestionFilters(params: SearchParams): QuestionFilters {
  const parsed = filterSchema.parse(
    Object.fromEntries(
      ["subject", "topic", "examTarget", "type", "difficulty", "status", "language"].map((k) => [
        k,
        first(params[k]),
      ]),
    ),
  );
  return Object.fromEntries(Object.entries(parsed).filter(([, v]) => v !== undefined)) as QuestionFilters;
}

export function filtersToQuery(filters: QuestionFilters, extra: Record<string, string> = {}): string {
  const entries = Object.entries({ ...filters, ...extra }).filter(
    (entry): entry is [string, string] => typeof entry[1] === "string" && entry[1].length > 0,
  );
  return entries.length ? `?${new URLSearchParams(entries).toString()}` : "";
}

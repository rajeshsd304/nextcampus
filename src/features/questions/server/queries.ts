import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";
import {
  ASSET_BUCKET,
  type LanguageFilter,
  type QuestionDifficulty,
  type QuestionStatus,
  type QuestionType,
} from "../constants";
import type { BankContext } from "./context";

export const QUESTION_PAGE_SIZE = 20;

export type QuestionFilters = {
  subject?: string;
  topic?: string;
  examTarget?: string;
  type?: QuestionType;
  difficulty?: QuestionDifficulty;
  status?: QuestionStatus;
  language?: LanguageFilter;
  mine?: boolean;
};

export type QuestionListItem = Pick<
  Tables<"questions">,
  | "id"
  | "type"
  | "status"
  | "difficulty"
  | "subject_id"
  | "topic_id"
  | "exam_target_id"
  | "stem_bn"
  | "stem_en"
  | "marks"
  | "bn_complete"
  | "en_complete"
  | "updated_at"
  | "created_by"
>;

const LIST_COLUMNS =
  "id, type, status, difficulty, subject_id, topic_id, exam_target_id, stem_bn, stem_en, marks, bn_complete, en_complete, updated_at, created_by";

/** Opaque keyset cursor over (updated_at desc, id desc). */
export function encodeCursor(item: Pick<QuestionListItem, "updated_at" | "id">): string {
  return Buffer.from(`${item.updated_at}|${item.id}`, "utf8").toString("base64url");
}

export function decodeCursor(cursor: string | undefined): { updatedAt: string; id: string } | null {
  if (!cursor || cursor.length > 200) return null;
  const [updatedAt, id] = Buffer.from(cursor, "base64url").toString("utf8").split("|");
  if (!updatedAt || !id || Number.isNaN(Date.parse(updatedAt)) || !/^[0-9a-f-]{36}$/.test(id)) return null;
  return { updatedAt, id };
}

export async function listQuestions(
  context: BankContext,
  filters: QuestionFilters,
  cursor?: string,
): Promise<{ items: QuestionListItem[]; nextCursor: string | null }> {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("questions")
    .select(LIST_COLUMNS)
    .eq("owner_org_id", context.orgId)
    .order("updated_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(QUESTION_PAGE_SIZE + 1);

  if (filters.subject) query = query.eq("subject_id", filters.subject);
  if (filters.topic) query = query.eq("topic_id", filters.topic);
  if (filters.examTarget) query = query.eq("exam_target_id", filters.examTarget);
  if (filters.type) query = query.eq("type", filters.type);
  if (filters.difficulty) query = query.eq("difficulty", filters.difficulty);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.mine) query = query.eq("created_by", context.viewer.user.id);
  switch (filters.language) {
    case "both":
      query = query.eq("bn_complete", true).eq("en_complete", true);
      break;
    case "bn":
      query = query.eq("bn_complete", true).eq("en_complete", false);
      break;
    case "en":
      query = query.eq("bn_complete", false).eq("en_complete", true);
      break;
    case "incomplete":
      query = query.eq("bn_complete", false).eq("en_complete", false);
      break;
  }

  const position = decodeCursor(cursor);
  if (position) {
    query = query.or(
      `updated_at.lt."${position.updatedAt}",and(updated_at.eq."${position.updatedAt}",id.lt.${position.id})`,
    );
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to load questions: ${error.message}`);
  const items = data.slice(0, QUESTION_PAGE_SIZE);
  const last = items[items.length - 1];
  return { items, nextCursor: data.length > QUESTION_PAGE_SIZE && last ? encodeCursor(last) : null };
}

export type QuestionDetail = {
  question: Tables<"questions">;
  options: Tables<"question_options">[];
  answerKey: Tables<"question_answer_keys"> | null;
  spec: Tables<"written_question_specs"> | null;
  modelAnswer: Tables<"model_answers"> | null;
  rubric: Tables<"rubrics"> | null;
  criteria: Tables<"rubric_criteria">[];
  assets: (Tables<"question_assets"> & { url: string | null })[];
  creatorLabel: string | null;
};

/** Full question including answer data. RLS returns nothing outside the owner org. */
export async function getQuestionDetail(context: BankContext, id: string): Promise<QuestionDetail | null> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const supabase = await createSupabaseServerClient();
  const { data: question, error } = await supabase
    .from("questions")
    .select("*")
    .eq("id", id)
    .eq("owner_org_id", context.orgId)
    .maybeSingle();
  if (error) throw new Error(`Failed to load question: ${error.message}`);
  if (!question) return null;

  const [options, answerKey, spec, modelAnswer, rubric, assets, creator] = await Promise.all([
    supabase.from("question_options").select("*").eq("question_id", id).order("sort_order"),
    supabase.from("question_answer_keys").select("*").eq("question_id", id).maybeSingle(),
    supabase.from("written_question_specs").select("*").eq("question_id", id).maybeSingle(),
    supabase.from("model_answers").select("*").eq("question_id", id).maybeSingle(),
    supabase.from("rubrics").select("*").eq("question_id", id).maybeSingle(),
    supabase.from("question_assets").select("*").eq("question_id", id).order("sort_order"),
    question.created_by
      ? supabase
          .from("profiles")
          .select("full_name, display_name, email")
          .eq("id", question.created_by)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const criteria = rubric.data
    ? ((
        await supabase.from("rubric_criteria").select("*").eq("rubric_id", rubric.data.id).order("sort_order")
      ).data ?? [])
    : [];

  const assetRows = assets.data ?? [];
  const signed = assetRows.length
    ? ((
        await supabase.storage.from(ASSET_BUCKET).createSignedUrls(
          assetRows.map((a) => a.storage_path),
          3600,
        )
      ).data ?? [])
    : [];
  const urls = new Map(signed.map((s) => [s.path, s.signedUrl]));

  return {
    question,
    options: options.data ?? [],
    answerKey: answerKey.data ?? null,
    spec: spec.data ?? null,
    modelAnswer: modelAnswer.data ?? null,
    rubric: rubric.data ?? null,
    criteria,
    assets: assetRows.map((a) => ({ ...a, url: urls.get(a.storage_path) ?? null })),
    creatorLabel: creator.data
      ? (creator.data.display_name ?? creator.data.full_name ?? creator.data.email)
      : null,
  };
}

export type RevisionEntry = Tables<"question_revisions"> & { actorLabel: string | null };

export async function listRevisions(questionId: string): Promise<RevisionEntry[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("question_revisions")
    .select("*")
    .eq("question_id", questionId)
    .order("revision", { ascending: false })
    .limit(100);
  if (error) throw new Error(`Failed to load revisions: ${error.message}`);
  const actorIds = [...new Set(data.map((r) => r.actor_id).filter((v): v is string => Boolean(v)))];
  const { data: profiles } = actorIds.length
    ? await supabase.from("profiles").select("id, full_name, display_name, email").in("id", actorIds)
    : { data: [] };
  const labels = new Map((profiles ?? []).map((p) => [p.id, p.display_name ?? p.full_name ?? p.email]));
  return data.map((r) => ({ ...r, actorLabel: r.actor_id ? (labels.get(r.actor_id) ?? null) : null }));
}

export type Taxonomy = {
  subjects: Pick<Tables<"subjects">, "id" | "slug" | "name_en" | "name_bn">[];
  topics: Pick<Tables<"topics">, "id" | "slug" | "subject_id" | "parent_id" | "name_en" | "name_bn">[];
  examTargets: Pick<Tables<"exam_targets">, "id" | "slug" | "name_en" | "name_bn" | "university_id">[];
  universities: Pick<Tables<"universities">, "id" | "short_code">[];
};

/** Active reference data used by filters, the editor and the importer. */
export async function loadTaxonomy(): Promise<Taxonomy> {
  const supabase = await createSupabaseServerClient();
  const [subjects, topics, examTargets, universities] = await Promise.all([
    supabase.from("subjects").select("id, slug, name_en, name_bn").eq("is_active", true).order("sort_order"),
    supabase
      .from("topics")
      .select("id, slug, subject_id, parent_id, name_en, name_bn")
      .eq("is_active", true)
      .order("sort_order"),
    supabase
      .from("exam_targets")
      .select("id, slug, name_en, name_bn, university_id")
      .eq("is_active", true)
      .order("sort_order"),
    supabase.from("universities").select("id, short_code").eq("is_active", true).order("sort_order"),
  ]);
  const error = subjects.error ?? topics.error ?? examTargets.error ?? universities.error;
  if (error) throw new Error(`Failed to load taxonomy: ${error.message}`);
  return {
    subjects: subjects.data ?? [],
    topics: topics.data ?? [],
    examTargets: examTargets.data ?? [],
    universities: universities.data ?? [],
  };
}

export async function countInReview(context: BankContext): Promise<number> {
  const supabase = await createSupabaseServerClient();
  const { count } = await supabase
    .from("questions")
    .select("id", { count: "exact", head: true })
    .eq("owner_org_id", context.orgId)
    .eq("status", "in_review");
  return count ?? 0;
}

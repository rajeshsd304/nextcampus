"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fail, invalid, ok, type ActionResult } from "@/lib/action-result";
import { errorCodeFromDatabase } from "@/lib/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  ASSET_BUCKET,
  ASSET_MAX_BYTES,
  ASSET_MIME_TYPES,
  IMPORT_MAX_BYTES,
  QUESTION_ACTIONS,
} from "./constants";
import { parseImportCsv, type ImportIssue, type ImportLookups } from "./import/csv";
import { questionFormSchema, toSavePayload } from "./schemas";
import { bankRefSchema, resolveBank, type BankContext } from "./server/context";
import { loadTaxonomy } from "./server/queries";

async function bankOrFail(input: unknown): Promise<BankContext | null> {
  const parsed = bankRefSchema.safeParse(input);
  return parsed.success ? resolveBank(parsed.data) : null;
}

// ---------------------------------------------------------------------------
// Save (create or edit a draft)
// ---------------------------------------------------------------------------

const saveSchema = z.object({
  bank: z.unknown(),
  questionId: z.uuid().optional(),
  values: questionFormSchema,
});

export type SavedQuestion = { questionId: string; revision: number; duplicateIds: string[] };

export async function saveQuestionAction(input: unknown): Promise<ActionResult<SavedQuestion>> {
  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const bank = await bankOrFail(parsed.data.bank);
  if (!bank || !bank.canAuthor) return fail("not_authorized");

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("save_question", {
    p_question_id: parsed.data.questionId ?? null,
    p_owner_org_id: bank.orgId,
    p_payload: toSavePayload(parsed.data.values),
  });
  if (error) return fail(errorCodeFromDatabase(error));
  const saved = data[0];
  if (!saved) return fail("unexpected");

  revalidatePath(bank.basePath, "layout");
  return ok(
    { questionId: saved.question_id, revision: saved.revision, duplicateIds: saved.duplicate_ids },
    "questionForms.saved",
  );
}

// ---------------------------------------------------------------------------
// Status transitions
// ---------------------------------------------------------------------------

const transitionInput = z
  .object({
    bank: z.unknown(),
    questionId: z.uuid(),
    action: z.enum(QUESTION_ACTIONS),
    reason: z.string().trim().max(1000, "validation.textTooLong"),
  })
  .superRefine((value, ctx) => {
    if (value.action === "reject" && value.reason.length < 3) {
      ctx.addIssue({ code: "custom", path: ["reason"], message: "validation.reasonRequired" });
    }
  });

export async function transitionQuestionAction(input: unknown): Promise<ActionResult> {
  const parsed = transitionInput.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const bank = await bankOrFail(parsed.data.bank);
  if (!bank) return fail("not_authorized");

  // The RPC enforces the state machine and who may do what; this is an early,
  // clearer refusal for actions the caller's role can never perform.
  const reviewerOnly = ["reject", "publish", "archive", "restore"].includes(parsed.data.action);
  if (reviewerOnly && !bank.canReview) return fail("not_authorized");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("transition_question", {
    p_question_id: parsed.data.questionId,
    p_action: parsed.data.action,
    p_reason: parsed.data.reason || null,
  });
  if (error) return fail(errorCodeFromDatabase(error));

  revalidatePath(bank.basePath, "layout");
  return ok(undefined, `questionForms.transitionDone.${parsed.data.action}`);
}

// ---------------------------------------------------------------------------
// Assets: signed upload URL → client uploads → register
// ---------------------------------------------------------------------------

const uploadSchema = z.object({
  bank: z.unknown(),
  questionId: z.uuid(),
  mimeType: z.enum(
    Object.keys(ASSET_MIME_TYPES) as [keyof typeof ASSET_MIME_TYPES, ...(keyof typeof ASSET_MIME_TYPES)[]],
    {
      error: "validation.imageType",
    },
  ),
  size: z.number().int().positive().max(ASSET_MAX_BYTES, "validation.imageTooLarge"),
});

export async function createAssetUploadAction(
  input: unknown,
): Promise<ActionResult<{ path: string; token: string }>> {
  const parsed = uploadSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const bank = await bankOrFail(parsed.data.bank);
  if (!bank?.canAuthor) return fail("not_authorized");

  const path = `${bank.orgId}/${parsed.data.questionId}/${crypto.randomUUID()}.${ASSET_MIME_TYPES[parsed.data.mimeType]}`;
  const supabase = await createSupabaseServerClient();
  // Storage RLS (private.can_upload_question_asset) decides whether this user
  // may write to this path: only editable drafts in their own organization.
  const { data, error } = await supabase.storage.from(ASSET_BUCKET).createSignedUploadUrl(path);
  if (error || !data) return fail("not_authorized");
  return ok({ path: data.path, token: data.token });
}

const registerSchema = z.object({
  bank: z.unknown(),
  questionId: z.uuid(),
  path: z.string().max(200),
  altBn: z.string().trim().max(300, "validation.textTooLong"),
  altEn: z.string().trim().max(300, "validation.textTooLong"),
});

export async function registerAssetAction(input: unknown): Promise<ActionResult> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const bank = await bankOrFail(parsed.data.bank);
  if (!bank?.canAuthor) return fail("not_authorized");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("add_question_asset", {
    p_question_id: parsed.data.questionId,
    p_storage_path: parsed.data.path,
    p_alt_bn: parsed.data.altBn,
    p_alt_en: parsed.data.altEn,
  });
  if (error) return fail(errorCodeFromDatabase(error));
  revalidatePath(bank.basePath, "layout");
  return ok(undefined, "questionForms.assets.added");
}

export async function removeAssetAction(input: unknown): Promise<ActionResult> {
  const parsed = z.object({ bank: z.unknown(), assetId: z.uuid() }).safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const bank = await bankOrFail(parsed.data.bank);
  if (!bank?.canAuthor) return fail("not_authorized");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("remove_question_asset", { p_asset_id: parsed.data.assetId });
  if (error) return fail(errorCodeFromDatabase(error));
  revalidatePath(bank.basePath, "layout");
  return ok(undefined, "questionForms.assets.removed");
}

// ---------------------------------------------------------------------------
// CSV import
// ---------------------------------------------------------------------------

export type ImportOutcome = "valid" | "created" | "updated" | "unchanged" | "skipped" | "error";

export type ImportReportRow = {
  row: number;
  externalId: string;
  outcome: ImportOutcome;
  issues: ImportIssue[];
  duplicates: number;
  questionId?: string;
};

export type ImportReport = { dryRun: boolean; rows: ImportReportRow[] };

async function lookups(): Promise<ImportLookups> {
  const taxonomy = await loadTaxonomy();
  return {
    subjects: new Map(taxonomy.subjects.map((s) => [s.slug, s.id])),
    topics: new Map(taxonomy.topics.map((t) => [t.slug, { id: t.id, subjectId: t.subject_id }])),
    examTargets: new Map(taxonomy.examTargets.map((e) => [e.slug, e.id])),
  };
}

/** Runs `worker` over items with bounded concurrency, preserving order. */
async function mapLimit<T, R>(items: T[], limit: number, worker: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const index = next++;
        results[index] = await worker(items[index]!);
      }
    }),
  );
  return results;
}

/**
 * Imports questions from CSV. Dry run validates everything (including slugs
 * and duplicate warnings) without writing. A real run is idempotent: rows are
 * matched to existing questions by `external_id`; drafts are updated (no new
 * revision if nothing changed), non-drafts are skipped.
 */
export async function importQuestionsAction(formData: FormData): Promise<ActionResult<ImportReport>> {
  const bankInput = (() => {
    try {
      return JSON.parse(String(formData.get("bank") ?? "null")) as unknown;
    } catch {
      return null;
    }
  })();
  const bank = await bankOrFail(bankInput);
  if (!bank?.canAuthor) return fail("not_authorized");

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0)
    return fail("invalid_input", { file: ["questionImport.issues.fileRequired"] });
  if (file.size > IMPORT_MAX_BYTES)
    return fail("invalid_input", { file: ["questionImport.issues.fileTooLarge"] });
  if (!/\.csv$/i.test(file.name)) return fail("invalid_input", { file: ["questionImport.issues.fileType"] });
  const dryRun = formData.get("dryRun") === "on";

  const parsed = parseImportCsv(await file.text(), await lookups());
  if (!parsed.ok) return fail("invalid_input", { file: [parsed.issue.code] });

  const supabase = await createSupabaseServerClient();
  const externalIds = parsed.rows.map((r) => r.externalId).filter(Boolean);
  const { data: existing, error } = await supabase
    .from("questions")
    .select("id, import_key, status")
    .eq("owner_org_id", bank.orgId)
    .in("import_key", externalIds.length ? externalIds : ["-"]);
  if (error) return fail(errorCodeFromDatabase(error));
  const byKey = new Map(existing.map((q) => [q.import_key, q]));

  const rows = await mapLimit(parsed.rows, 6, async (row): Promise<ImportReportRow> => {
    if (!row.ok)
      return {
        row: row.row,
        externalId: row.externalId,
        outcome: "error",
        issues: row.issues,
        duplicates: 0,
      };
    const current = byKey.get(row.externalId);

    if (dryRun) {
      const { data: dupes } = await supabase.rpc("find_duplicate_questions", {
        p_owner_org_id: bank.orgId,
        p_stem_bn: row.values.stemBn || null,
        p_stem_en: row.values.stemEn || null,
        ...(current ? { p_exclude: current.id } : {}),
      });
      const skipped = current && current.status !== "draft";
      return {
        row: row.row,
        externalId: row.externalId,
        outcome: skipped ? "skipped" : "valid",
        issues: skipped ? [{ code: "questionImport.issues.notDraft" }] : [],
        duplicates: dupes?.length ?? 0,
        ...(current ? { questionId: current.id } : {}),
      };
    }

    if (current && current.status !== "draft") {
      return {
        row: row.row,
        externalId: row.externalId,
        outcome: "skipped",
        issues: [{ code: "questionImport.issues.notDraft" }],
        duplicates: 0,
        questionId: current.id,
      };
    }

    const previous = current
      ? ((
          await supabase
            .from("question_revisions")
            .select("revision")
            .eq("question_id", current.id)
            .order("revision", { ascending: false })
            .limit(1)
        ).data?.[0]?.revision ?? 0)
      : 0;
    const { data, error: saveError } = await supabase.rpc("save_question", {
      p_question_id: current?.id ?? null,
      p_owner_org_id: bank.orgId,
      p_payload: toSavePayload(row.values, row.externalId),
    });
    const saved = data?.[0];
    if (saveError || !saved) {
      return {
        row: row.row,
        externalId: row.externalId,
        outcome: "error",
        issues: [{ code: `errors.${errorCodeFromDatabase(saveError)}` }],
        duplicates: 0,
      };
    }
    return {
      row: row.row,
      externalId: row.externalId,
      outcome: !current ? "created" : saved.revision > previous ? "updated" : "unchanged",
      issues: [],
      duplicates: saved.duplicate_ids.length,
      questionId: saved.question_id,
    };
  });

  if (!dryRun) revalidatePath(bank.basePath, "layout");
  return ok({ dryRun, rows });
}

"use server";

import { revalidatePath } from "next/cache";
import { getViewer } from "@/features/auth/server/session";
import { fail, invalid, ok, type ActionResult } from "@/lib/action-result";
import { errorCodeFromDatabase } from "@/lib/errors";
import { createSupabaseServerClient, type SupabaseServerClient } from "@/lib/supabase/server";
import {
  catalogActiveSchema,
  catalogItemSchema,
  catalogMoveSchema,
  categoryFormSchema,
  examTargetFormSchema,
  subjectFormSchema,
  topicFormSchema,
  universityFormSchema,
} from "./schemas";

/**
 * Server-side platform-admin check. RLS (`private.is_super_admin()`) is the
 * final authority; this gives a clear error before touching the database.
 */
async function authorize(): Promise<SupabaseServerClient | null> {
  const viewer = await getViewer();
  if (!viewer?.isSuperAdmin) return null;
  return createSupabaseServerClient();
}

function revalidateCatalog() {
  // The public catalog, homepage strip, sitemap and admin pages read this data.
  revalidatePath("/", "layout");
}

type SortableTable = "university_categories" | "universities" | "subjects" | "exam_targets" | "topics";

async function nextSortOrder(supabase: SupabaseServerClient, table: SortableTable): Promise<number> {
  const { data } = await supabase
    .from(table)
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1);
  return Math.min(100_000, (data?.[0]?.sort_order ?? 0) + 10);
}

function writeError(error: { message?: string; code?: string }) {
  const code = errorCodeFromDatabase(error);
  return code === "already_exists"
    ? fail(code, { slug: ["errors.already_exists"], key: ["errors.already_exists"] })
    : fail(code);
}

export async function saveCategoryAction(input: unknown): Promise<ActionResult> {
  const parsed = categoryFormSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await authorize();
  if (!supabase) return fail("not_authorized");

  const row = {
    key: parsed.data.key,
    name_en: parsed.data.nameEn,
    name_bn: parsed.data.nameBn,
    is_active: parsed.data.isActive,
  };
  const { data, error } = parsed.data.originalKey
    ? await supabase
        .from("university_categories")
        .update(row)
        .eq("key", parsed.data.originalKey)
        .select("key")
    : await supabase
        .from("university_categories")
        .insert({ ...row, sort_order: await nextSortOrder(supabase, "university_categories") })
        .select("key");
  if (error) return writeError(error);
  if (!data?.length) return fail("not_authorized");

  revalidateCatalog();
  return ok(undefined, "catalogAdmin.saved");
}

export async function saveUniversityAction(input: unknown): Promise<ActionResult> {
  const parsed = universityFormSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await authorize();
  if (!supabase) return fail("not_authorized");

  const row = {
    slug: parsed.data.slug,
    name_en: parsed.data.nameEn,
    name_bn: parsed.data.nameBn,
    short_code: parsed.data.shortCode,
    category_key: parsed.data.categoryKey,
    website: parsed.data.website || null,
    is_active: parsed.data.isActive,
  };
  const { data, error } = parsed.data.id
    ? await supabase.from("universities").update(row).eq("id", parsed.data.id).select("id")
    : await supabase
        .from("universities")
        .insert({ ...row, sort_order: await nextSortOrder(supabase, "universities") })
        .select("id");
  if (error) return writeError(error);
  if (!data?.length) return fail("not_authorized");

  revalidateCatalog();
  return ok(undefined, "catalogAdmin.saved");
}

export async function saveSubjectAction(input: unknown): Promise<ActionResult> {
  const parsed = subjectFormSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await authorize();
  if (!supabase) return fail("not_authorized");

  const row = {
    slug: parsed.data.slug,
    name_en: parsed.data.nameEn,
    name_bn: parsed.data.nameBn,
    is_active: parsed.data.isActive,
  };
  const { data, error } = parsed.data.id
    ? await supabase.from("subjects").update(row).eq("id", parsed.data.id).select("id")
    : await supabase
        .from("subjects")
        .insert({ ...row, sort_order: await nextSortOrder(supabase, "subjects") })
        .select("id");
  if (error) return writeError(error);
  if (!data?.length) return fail("not_authorized");

  revalidateCatalog();
  return ok(undefined, "catalogAdmin.saved");
}

export async function saveTopicAction(input: unknown): Promise<ActionResult> {
  const parsed = topicFormSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await authorize();
  if (!supabase) return fail("not_authorized");

  const row = {
    subject_id: parsed.data.subjectId,
    parent_id: parsed.data.parentId || null,
    slug: parsed.data.slug,
    name_en: parsed.data.nameEn,
    name_bn: parsed.data.nameBn,
    is_active: parsed.data.isActive,
  };
  const { data, error } = parsed.data.id
    ? await supabase.from("topics").update(row).eq("id", parsed.data.id).select("id")
    : await supabase
        .from("topics")
        .insert({ ...row, sort_order: await nextSortOrder(supabase, "topics") })
        .select("id");
  if (error) return writeError(error);
  if (!data?.length) return fail("not_authorized");

  revalidateCatalog();
  return ok(undefined, "catalogAdmin.saved");
}

export async function saveExamTargetAction(input: unknown): Promise<ActionResult> {
  const parsed = examTargetFormSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await authorize();
  if (!supabase) return fail("not_authorized");

  const row = {
    university_id: parsed.data.universityId,
    slug: parsed.data.slug,
    name_en: parsed.data.nameEn,
    name_bn: parsed.data.nameBn,
    description_en: parsed.data.descriptionEn || null,
    description_bn: parsed.data.descriptionBn || null,
    typical_format_en: parsed.data.formatEn || null,
    typical_format_bn: parsed.data.formatBn || null,
    negative_marking: Math.round(parsed.data.negativeMarking * 100) / 100,
    is_active: parsed.data.isActive,
  };
  const { data, error } = parsed.data.id
    ? await supabase.from("exam_targets").update(row).eq("id", parsed.data.id).select("id")
    : await supabase
        .from("exam_targets")
        .insert({ ...row, sort_order: await nextSortOrder(supabase, "exam_targets") })
        .select("id");
  if (error) return writeError(error);
  const saved = data?.[0];
  if (!saved) return fail("not_authorized");

  const { error: subjectsError } = await supabase.rpc("set_exam_target_subjects", {
    p_exam_target_id: saved.id,
    p_subject_ids: parsed.data.subjectIds,
  });
  if (subjectsError) return fail(errorCodeFromDatabase(subjectsError));

  revalidateCatalog();
  return ok(undefined, "catalogAdmin.saved");
}

type Entity = "university_category" | "university" | "subject" | "exam_target" | "topic";

function isEntity(value: string): value is Entity {
  return ["university_category", "university", "subject", "exam_target", "topic"].includes(value);
}

/** Per-table queries (typed separately: the key column differs for categories). */
function setActive(supabase: SupabaseServerClient, entity: Entity, id: string, active: boolean) {
  switch (entity) {
    case "university_category":
      return supabase
        .from("university_categories")
        .update({ is_active: active })
        .eq("key", id)
        .select("is_active");
    case "university":
      return supabase.from("universities").update({ is_active: active }).eq("id", id).select("is_active");
    case "subject":
      return supabase.from("subjects").update({ is_active: active }).eq("id", id).select("is_active");
    case "exam_target":
      return supabase.from("exam_targets").update({ is_active: active }).eq("id", id).select("is_active");
    case "topic":
      return supabase.from("topics").update({ is_active: active }).eq("id", id).select("is_active");
  }
}

function remove(supabase: SupabaseServerClient, entity: Entity, id: string) {
  switch (entity) {
    case "university_category":
      return supabase.from("university_categories").delete().eq("key", id).select("key");
    case "university":
      return supabase.from("universities").delete().eq("id", id).select("id");
    case "subject":
      return supabase.from("subjects").delete().eq("id", id).select("id");
    case "exam_target":
      return supabase.from("exam_targets").delete().eq("id", id).select("id");
    case "topic":
      return supabase.from("topics").delete().eq("id", id).select("id");
  }
}

/** Activates or deactivates a row. Deactivated rows disappear from the public catalog; data is kept. */
export async function setCatalogActiveAction(input: unknown): Promise<ActionResult> {
  const parsed = catalogActiveSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  if (!isEntity(parsed.data.entity)) return fail("invalid_input");
  const supabase = await authorize();
  if (!supabase) return fail("not_authorized");

  const { data, error } = await setActive(supabase, parsed.data.entity, parsed.data.id, parsed.data.active);
  if (error) return fail(errorCodeFromDatabase(error));
  if (!data?.length) return fail("catalog_item_not_found");

  revalidateCatalog();
  return ok(undefined, parsed.data.active ? "catalogAdmin.activated" : "catalogAdmin.deactivated");
}

export async function moveCatalogItemAction(input: unknown): Promise<ActionResult> {
  const parsed = catalogMoveSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await authorize();
  if (!supabase) return fail("not_authorized");

  const { error } = await supabase.rpc("move_catalog_item", {
    p_entity: parsed.data.entity,
    p_id: parsed.data.id,
    p_direction: parsed.data.direction,
  });
  if (error) return fail(errorCodeFromDatabase(error));

  revalidateCatalog();
  return ok(undefined);
}

/** Deletes a row. Blocked by the database while other rows reference it (`in_use`). */
export async function deleteCatalogItemAction(input: unknown): Promise<ActionResult> {
  const parsed = catalogItemSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  if (!isEntity(parsed.data.entity)) return fail("invalid_input");
  const supabase = await authorize();
  if (!supabase) return fail("not_authorized");

  const { data, error } = await remove(supabase, parsed.data.entity, parsed.data.id);
  if (error) return fail(errorCodeFromDatabase(error));
  if (!data?.length) return fail("catalog_item_not_found");

  revalidateCatalog();
  return ok(undefined, "catalogAdmin.deleted");
}

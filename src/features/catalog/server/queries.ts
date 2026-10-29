import "server-only";
import { createPublicSupabaseClient } from "@/lib/supabase/public";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Catalog } from "../types";

type Client =
  ReturnType<typeof createPublicSupabaseClient> | Awaited<ReturnType<typeof createSupabaseServerClient>>;

async function load(supabase: Client): Promise<Catalog> {
  const [categories, universities, subjects, targets] = await Promise.all([
    supabase
      .from("university_categories")
      .select("key, name_en, name_bn, sort_order, is_active")
      .order("sort_order"),
    supabase
      .from("universities")
      .select("id, slug, name_en, name_bn, short_code, category_key, website, sort_order, is_active")
      .order("sort_order"),
    supabase.from("subjects").select("id, slug, name_en, name_bn, sort_order, is_active").order("sort_order"),
    supabase
      .from("exam_targets")
      .select(
        "id, university_id, slug, name_en, name_bn, description_en, description_bn, typical_format_en, typical_format_bn, negative_marking, sort_order, is_active, exam_target_subjects(subject_id)",
      )
      .order("sort_order"),
  ]);
  const error = categories.error ?? universities.error ?? subjects.error ?? targets.error;
  if (error) throw new Error(`Failed to load catalog: ${error.message}`);

  return {
    categories: categories.data ?? [],
    universities: universities.data ?? [],
    subjects: subjects.data ?? [],
    targets: (targets.data ?? []).map(({ exam_target_subjects, ...target }) => ({
      ...target,
      negative_marking: Number(target.negative_marking),
      subjectIds: exam_target_subjects.map((link) => link.subject_id),
    })),
  };
}

export type CatalogResult = { ok: true; catalog: Catalog } | { ok: false };

/**
 * Public catalog (active rows only, enforced by RLS for `anon`). Never throws:
 * public pages render an accessible error state when the database is down.
 */
export async function loadPublicCatalog(): Promise<CatalogResult> {
  try {
    return { ok: true, catalog: await load(createPublicSupabaseClient()) };
  } catch (error) {
    console.error(`[catalog] ${error instanceof Error ? error.message : "unknown error"}`);
    return { ok: false };
  }
}

/** Full catalog including inactive rows. Platform admins only (RLS). */
export async function loadAdminCatalog(): Promise<Catalog> {
  return load(await createSupabaseServerClient());
}

export type CatalogFilters = { university?: string; category?: string; subject?: string };

/** Applies URL filters (slugs/keys) to a loaded catalog. Unknown values match nothing. */
export function filterCatalog(catalog: Catalog, filters: CatalogFilters) {
  const university = filters.university
    ? catalog.universities.find((u) => u.slug === filters.university)
    : undefined;
  const subject = filters.subject ? catalog.subjects.find((s) => s.slug === filters.subject) : undefined;

  const universities = catalog.universities.filter(
    (u) =>
      (!filters.university || u.id === university?.id) &&
      (!filters.category || u.category_key === filters.category),
  );
  const allowed = new Set(universities.map((u) => u.id));
  const targets = catalog.targets.filter(
    (t) =>
      allowed.has(t.university_id) &&
      (!filters.subject || (subject ? t.subjectIds.includes(subject.id) : false)),
  );
  const withTargets = new Set(targets.map((t) => t.university_id));
  return { universities: universities.filter((u) => withTargets.has(u.id)), targets };
}

import type { Locale } from "@/i18n/config";
import type { Tables } from "@/types/database";

export type CatalogCategory = Pick<
  Tables<"university_categories">,
  "key" | "name_en" | "name_bn" | "sort_order" | "is_active"
>;
export type CatalogUniversity = Pick<
  Tables<"universities">,
  | "id"
  | "slug"
  | "name_en"
  | "name_bn"
  | "short_code"
  | "category_key"
  | "website"
  | "sort_order"
  | "is_active"
>;
export type CatalogSubject = Pick<
  Tables<"subjects">,
  "id" | "slug" | "name_en" | "name_bn" | "sort_order" | "is_active"
>;
export type CatalogTarget = Pick<
  Tables<"exam_targets">,
  | "id"
  | "university_id"
  | "slug"
  | "name_en"
  | "name_bn"
  | "description_en"
  | "description_bn"
  | "typical_format_en"
  | "typical_format_bn"
  | "negative_marking"
  | "sort_order"
  | "is_active"
> & { subjectIds: string[] };

export type Catalog = {
  categories: CatalogCategory[];
  universities: CatalogUniversity[];
  subjects: CatalogSubject[];
  targets: CatalogTarget[];
};

/** Admin-managed catalog entities (URL segment ↔ database entity name). */
export const CATALOG_ENTITIES = {
  categories: "university_category",
  universities: "university",
  subjects: "subject",
  targets: "exam_target",
} as const;
export type CatalogEntitySegment = keyof typeof CATALOG_ENTITIES;
export type CatalogEntity = (typeof CATALOG_ENTITIES)[CatalogEntitySegment];

export function isCatalogEntitySegment(value: unknown): value is CatalogEntitySegment {
  return typeof value === "string" && Object.hasOwn(CATALOG_ENTITIES, value);
}

type Bilingual<K extends string> = { [P in `${K}_en` | `${K}_bn`]: string | null };

/** Picks the field for the active locale, falling back to English. */
export function localized<K extends string>(row: Bilingual<K>, field: K, locale: Locale): string {
  const primary = row[`${field}_${locale}` as `${K}_en`];
  return primary && primary.trim() ? primary : (row[`${field}_en` as `${K}_en`] ?? "");
}

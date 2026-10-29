import { z } from "zod";
import { CATALOG_ENTITIES } from "./types";
import { optionalUrlSchema } from "@/features/organizations/schemas";

export const catalogSlugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(2, "validation.catalogSlug")
  .max(60, "validation.catalogSlug")
  .regex(/^[a-z0-9][a-z0-9-]{0,58}[a-z0-9]$/, "validation.catalogSlug")
  .refine((slug) => !slug.includes("--"), "validation.catalogSlug");

export const categoryKeySchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z][a-z0-9_]{1,39}$/, "validation.categoryKey");

const name = (max: number) =>
  z.string().trim().min(2, "validation.catalogNameMin").max(max, "validation.textTooLong");
const longText = (max: number) => z.string().trim().max(max, "validation.textTooLong");

export const categoryFormSchema = z.object({
  originalKey: z.string().optional(),
  key: categoryKeySchema,
  nameEn: name(80),
  nameBn: name(80),
  isActive: z.boolean(),
});

export const universityFormSchema = z.object({
  id: z.uuid().optional(),
  slug: catalogSlugSchema,
  nameEn: name(160),
  nameBn: name(160),
  shortCode: z.string().trim().min(1, "validation.shortCode").max(16, "validation.shortCode"),
  categoryKey: categoryKeySchema,
  website: optionalUrlSchema,
  isActive: z.boolean(),
});

export const subjectFormSchema = z.object({
  id: z.uuid().optional(),
  slug: catalogSlugSchema,
  nameEn: name(80),
  nameBn: name(80),
  isActive: z.boolean(),
});

export const examTargetFormSchema = z.object({
  id: z.uuid().optional(),
  universityId: z.uuid("validation.universityRequired"),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9][a-z0-9-]{0,78}[a-z0-9]$/, "validation.catalogSlug")
    .refine((slug) => !slug.includes("--"), "validation.catalogSlug"),
  nameEn: name(160),
  nameBn: name(160),
  descriptionEn: longText(2000),
  descriptionBn: longText(2000),
  formatEn: longText(1000),
  formatBn: longText(1000),
  negativeMarking: z
    .number("validation.negativeMarking")
    .min(0, "validation.negativeMarking")
    .max(1, "validation.negativeMarking"),
  isActive: z.boolean(),
  subjectIds: z.array(z.uuid()).max(50),
});

const entity = z.enum(Object.values(CATALOG_ENTITIES) as [string, ...string[]]);
const itemId = z.string().min(1).max(64);

export const catalogItemSchema = z.object({ entity, id: itemId });
export const catalogActiveSchema = catalogItemSchema.extend({ active: z.boolean() });
export const catalogMoveSchema = catalogItemSchema.extend({ direction: z.enum(["up", "down"]) });

export type CategoryFormInput = z.input<typeof categoryFormSchema>;
export type UniversityFormInput = z.input<typeof universityFormSchema>;
export type SubjectFormInput = z.input<typeof subjectFormSchema>;
export type ExamTargetFormInput = z.input<typeof examTargetFormSchema>;

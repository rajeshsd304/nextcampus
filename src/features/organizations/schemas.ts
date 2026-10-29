import { z } from "zod";
import { ORG_ROLES } from "@/features/access/roles";
import { ORGANIZATION_TYPES, RESERVED_SLUGS } from "./constants";

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "validation.slugMin")
  .max(48, "validation.slugMax")
  .regex(/^[a-z0-9](?:[a-z0-9-]{1,46}[a-z0-9])$/, "validation.slugPattern")
  .refine((slug) => !slug.includes("--"), "validation.slugDoubleHyphen")
  .refine((slug) => !RESERVED_SLUGS.has(slug), "validation.slugReserved");

const orgName = z.string().trim().min(2, "validation.orgNameMin").max(120, "validation.orgNameMax");

export const createOrganizationSchema = z.object({
  name: orgName,
  slug: slugSchema,
  type: z.enum(ORGANIZATION_TYPES, { error: "validation.orgTypeRequired" }),
});

export const optionalUrlSchema = z
  .string()
  .trim()
  .max(2048)
  .refine((value) => value === "" || /^https?:\/\/[^\s]+\.[^\s]+$/i.test(value), "validation.urlInvalid");

const optionalEmail = z
  .string()
  .trim()
  .toLowerCase()
  .max(320)
  .refine((value) => value === "" || z.email().safeParse(value).success, "validation.emailInvalid");

export const updateOrganizationSchema = z.object({
  organizationId: z.uuid(),
  name: orgName,
  type: z.enum(ORGANIZATION_TYPES),
  website: optionalUrlSchema,
  contactEmail: optionalEmail,
});

export const memberTargetSchema = z.object({
  organizationId: z.uuid(),
  userId: z.uuid(),
});

export const updateMemberRoleSchema = memberTargetSchema.extend({
  role: z.enum(ORG_ROLES),
});

export type CreateOrganizationInput = z.input<typeof createOrganizationSchema>;
export type UpdateOrganizationInput = z.input<typeof updateOrganizationSchema>;

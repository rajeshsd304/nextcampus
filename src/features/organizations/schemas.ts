import { z } from "zod";
import { ORG_ROLES } from "@/features/access/roles";
import { ORGANIZATION_TYPES, RESERVED_SLUGS } from "./constants";

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Use at least 3 characters.")
  .max(48, "Use at most 48 characters.")
  .regex(
    /^[a-z0-9](?:[a-z0-9-]{1,46}[a-z0-9])$/,
    "Use lowercase letters, numbers and hyphens; start and end with a letter or number.",
  )
  .refine((slug) => !slug.includes("--"), "Avoid consecutive hyphens.")
  .refine((slug) => !RESERVED_SLUGS.has(slug), "That address is reserved.");

export const createOrganizationSchema = z.object({
  name: z.string().trim().min(2, "Use at least 2 characters.").max(120, "Use at most 120 characters."),
  slug: slugSchema,
  type: z.enum(ORGANIZATION_TYPES, { error: "Choose an organization type." }),
});

const optionalUrl = z
  .string()
  .trim()
  .max(2048)
  .refine(
    (value) => value === "" || /^https?:\/\/[^\s]+\.[^\s]+$/i.test(value),
    "Enter a full URL starting with https://",
  );

const optionalEmail = z
  .string()
  .trim()
  .toLowerCase()
  .max(320)
  .refine((value) => value === "" || z.email().safeParse(value).success, "Enter a valid email address.");

export const updateOrganizationSchema = z.object({
  organizationId: z.uuid(),
  name: z.string().trim().min(2, "Use at least 2 characters.").max(120, "Use at most 120 characters."),
  type: z.enum(ORGANIZATION_TYPES),
  website: optionalUrl,
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

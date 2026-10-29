import type { Enums } from "@/types/database";

export type OrganizationType = Enums<"organization_type">;

/** Labels: messages `orgTypes.<type>`. */
export const ORGANIZATION_TYPES = [
  "university",
  "coaching_center",
  "training_organization",
  "independent_instructor",
  "other",
] as const satisfies readonly OrganizationType[];

/** Mirrors the reserved list in public.create_organization(). */
export const RESERVED_SLUGS = new Set([
  "admin",
  "api",
  "app",
  "auth",
  "dashboard",
  "exams",
  "help",
  "invite",
  "invitations",
  "login",
  "nextcampus",
  "notifications",
  "onboarding",
  "platform",
  "public",
  "settings",
  "sign-in",
  "sign-up",
  "support",
  "www",
]);

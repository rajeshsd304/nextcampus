import type { Enums } from "@/types/database";

export type OrganizationType = Enums<"organization_type">;

export const ORGANIZATION_TYPES = [
  "university",
  "coaching_center",
  "training_organization",
  "independent_instructor",
  "other",
] as const satisfies readonly OrganizationType[];

export const ORGANIZATION_TYPE_LABELS: Record<OrganizationType, string> = {
  university: "University",
  coaching_center: "Coaching center",
  training_organization: "Training organization",
  independent_instructor: "Independent instructor",
  other: "Other",
};

export const RESERVED_SLUGS = new Set([
  "admin",
  "api",
  "app",
  "auth",
  "dashboard",
  "help",
  "invite",
  "invitations",
  "login",
  "nextcampus",
  "notifications",
  "onboarding",
  "platform",
  "settings",
  "sign-in",
  "sign-up",
  "support",
  "www",
]);

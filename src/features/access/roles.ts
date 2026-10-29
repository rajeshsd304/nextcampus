import type { Enums } from "@/types/database";

export type OrgRole = Enums<"org_role">;

export const ORG_ROLES = [
  "org_admin",
  "instructor",
  "invigilator",
  "student",
] as const satisfies readonly OrgRole[];

export const ROLE_LABELS: Record<OrgRole, string> = {
  org_admin: "Organization Admin",
  instructor: "Instructor",
  invigilator: "Invigilator / Reviewer",
  student: "Student",
};

export const ROLE_DESCRIPTIONS: Record<OrgRole, string> = {
  org_admin: "Manages the organization, members, invitations and audit trail.",
  instructor: "Authors and runs assessments for their cohorts.",
  invigilator: "Monitors sessions and reviews flagged attempts.",
  student: "Takes assessments and tracks their results.",
};

/** Dashboard areas inside an organization workspace: `/o/[slug]/<area>`. */
export type DashboardArea = "admin" | "instructor" | "review" | "student";

export const ROLE_HOME_AREA: Record<OrgRole, DashboardArea> = {
  org_admin: "admin",
  instructor: "instructor",
  invigilator: "review",
  student: "student",
};

export function isOrgRole(value: unknown): value is OrgRole {
  return typeof value === "string" && (ORG_ROLES as readonly string[]).includes(value);
}

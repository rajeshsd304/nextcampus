import type { Enums } from "@/types/database";

export type OrgRole = Enums<"org_role">;

export const ORG_ROLES = [
  "org_admin",
  "instructor",
  "invigilator",
  "student",
] as const satisfies readonly OrgRole[];

/**
 * Roles as presented in the UI. The database roles and permission matrix are
 * unchanged; instructors and invigilators/reviewers share one label.
 * Labels and descriptions live in messages/<locale>.json under `roles.<key>`.
 */
export const DISPLAY_ROLES = ["student", "grader", "orgAdmin", "platformAdmin"] as const;
export type DisplayRole = (typeof DISPLAY_ROLES)[number];

export const ORG_ROLE_DISPLAY: Record<OrgRole, Exclude<DisplayRole, "platformAdmin">> = {
  student: "student",
  instructor: "grader",
  invigilator: "grader",
  org_admin: "orgAdmin",
};

/** Roles an organization admin can assign, in UI order. */
export const ASSIGNABLE_DISPLAY_ROLES = ["student", "grader", "orgAdmin"] as const;
export type AssignableDisplayRole = (typeof ASSIGNABLE_DISPLAY_ROLES)[number];

/**
 * Maps a UI role choice to a database role. Choosing "Instructor/Grader" keeps
 * an existing instructor or invigilator as-is and otherwise assigns instructor.
 */
export function toOrgRole(choice: AssignableDisplayRole, current?: OrgRole): OrgRole {
  switch (choice) {
    case "student":
      return "student";
    case "orgAdmin":
      return "org_admin";
    case "grader":
      return current === "instructor" || current === "invigilator" ? current : "instructor";
  }
}

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

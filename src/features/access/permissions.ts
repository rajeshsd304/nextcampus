import type { DashboardArea, OrgRole } from "./roles";

/**
 * Application mirror of `public.role_permissions`. The database is the
 * enforcement point (RLS + RPCs); this map drives server-side route guards and
 * UI affordances. tests/db/permissions.test.ts asserts both stay identical.
 */
export const PERMISSIONS = [
  "org.read",
  "org.update",
  "members.read",
  "members.manage",
  "invitations.read",
  "invitations.manage",
  "audit.read",
  "dashboard.admin",
  "dashboard.instructor",
  "dashboard.reviewer",
  "dashboard.student",
  "questions.read",
  "questions.author",
  "questions.review",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const ROLE_PERMISSIONS: Record<OrgRole, readonly Permission[]> = {
  org_admin: [
    "org.read",
    "org.update",
    "members.read",
    "members.manage",
    "invitations.read",
    "invitations.manage",
    "audit.read",
    "dashboard.admin",
    "questions.read",
    "questions.author",
    "questions.review",
  ],
  instructor: ["org.read", "members.read", "dashboard.instructor", "questions.read", "questions.author"],
  invigilator: ["org.read", "members.read", "dashboard.reviewer", "questions.read", "questions.author"],
  student: ["org.read", "dashboard.student"],
};

export const AREA_PERMISSION: Record<DashboardArea, Permission> = {
  admin: "dashboard.admin",
  instructor: "dashboard.instructor",
  review: "dashboard.reviewer",
  student: "dashboard.student",
};

export function roleHasPermission(role: OrgRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function canAccessArea(role: OrgRole, area: DashboardArea): boolean {
  return roleHasPermission(role, AREA_PERMISSION[area]);
}

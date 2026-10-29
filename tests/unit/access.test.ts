import { describe, expect, it } from "vitest";
import { AREA_PERMISSION, canAccessArea, roleHasPermission } from "@/features/access/permissions";
import { ORG_ROLES, ROLE_HOME_AREA, isOrgRole } from "@/features/access/roles";
import { isProtectedPath } from "@/lib/supabase/proxy";

describe("role-aware access", () => {
  it("each role can reach exactly its own dashboard area", () => {
    for (const role of ORG_ROLES) {
      const reachable = (Object.keys(AREA_PERMISSION) as (keyof typeof AREA_PERMISSION)[]).filter((area) =>
        canAccessArea(role, area),
      );
      expect(reachable, role).toEqual([ROLE_HOME_AREA[role]]);
    }
  });

  it("only org admins can manage members and invitations", () => {
    for (const role of ORG_ROLES) {
      expect(roleHasPermission(role, "members.manage"), role).toBe(role === "org_admin");
      expect(roleHasPermission(role, "invitations.manage"), role).toBe(role === "org_admin");
      expect(roleHasPermission(role, "audit.read"), role).toBe(role === "org_admin");
    }
  });

  it("students cannot see the roster", () => {
    expect(roleHasPermission("student", "members.read")).toBe(false);
    expect(roleHasPermission("instructor", "members.read")).toBe(true);
  });

  it("recognizes valid roles", () => {
    expect(isOrgRole("student")).toBe(true);
    expect(isOrgRole("super_admin")).toBe(false);
    expect(isOrgRole(42)).toBe(false);
  });
});

describe("proxy route protection", () => {
  it.each([
    "/dashboard",
    "/o/northbridge/admin",
    "/settings",
    "/settings/security",
    "/notifications",
    "/onboarding",
    "/onboarding/organization",
    "/invitations",
    "/platform",
    "/reset-password",
  ])("protects %s", (path) => expect(isProtectedPath(path)).toBe(true));

  it.each([
    "/",
    "/pricing",
    "/sign-in",
    "/invite/abc",
    "/dashboards-are-cool",
    "/settingsx",
    "/organizations",
  ])("leaves %s public", (path) => expect(isProtectedPath(path)).toBe(false));
});

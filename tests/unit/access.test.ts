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

describe("simplified role labels (UI only)", () => {
  it("maps instructors and invigilators to one Instructor/Grader label", async () => {
    const { ORG_ROLE_DISPLAY, toOrgRole } = await import("@/features/access/roles");
    expect(ORG_ROLE_DISPLAY).toEqual({
      student: "student",
      instructor: "grader",
      invigilator: "grader",
      org_admin: "orgAdmin",
    });
    expect(toOrgRole("grader")).toBe("instructor");
    expect(toOrgRole("grader", "invigilator")).toBe("invigilator");
    expect(toOrgRole("grader", "instructor")).toBe("instructor");
    expect(toOrgRole("student", "invigilator")).toBe("student");
    expect(toOrgRole("orgAdmin")).toBe("org_admin");
  });

  it("has a translated label and description for every display role", async () => {
    const { DISPLAY_ROLES } = await import("@/features/access/roles");
    const en = (await import("../../messages/en.json")).default;
    for (const role of DISPLAY_ROLES) {
      expect(en.roles[role].label.length).toBeGreaterThan(0);
      expect(en.roles[role].description.length).toBeGreaterThan(0);
    }
  });
});

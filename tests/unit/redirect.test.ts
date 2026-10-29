import { describe, expect, it } from "vitest";
import { safeRedirectPath } from "@/lib/redirect";

describe("safeRedirectPath", () => {
  it.each([
    ["/o/northbridge/admin", "/o/northbridge/admin"],
    ["/invite/abc?x=1#y", "/invite/abc?x=1#y"],
    ["/settings/security", "/settings/security"],
  ])("allows same-origin path %s", (input, expected) => {
    expect(safeRedirectPath(input)).toBe(expected);
  });

  it.each([
    [null],
    [undefined],
    [""],
    ["https://evil.example/phish"],
    ["//evil.example"],
    ["/\\evil.example"],
    ["\\\\evil.example"],
    ["javascript:alert(1)"],
    ["/%0d%0aSet-Cookie:x"],
    ["/foo\u0000bar"],
    ["dashboard"],
    ["/sign-in?next=/dashboard"],
    ["/auth/callback?code=1"],
  ])("rejects unsafe value %s", (input) => {
    expect(safeRedirectPath(input)).toBe("/dashboard");
  });

  it("uses a custom fallback", () => {
    expect(safeRedirectPath("//evil", { fallback: "/onboarding" })).toBe("/onboarding");
  });

  it("accepts absolute URLs only for the configured origin", () => {
    expect(safeRedirectPath("http://localhost:3000/o/x/student", { origin: "http://localhost:3000" })).toBe(
      "/o/x/student",
    );
    expect(safeRedirectPath("https://evil.example/o/x", { origin: "http://localhost:3000" })).toBe(
      "/dashboard",
    );
    expect(safeRedirectPath("https://evil.example/o/x")).toBe("/dashboard");
  });
});

describe("safeRedirectPath encoded payloads", () => {
  it.each(["/%2F%2Fevil.example", "/%5Cevil.example", "/%E0%A4%A", "/x%00y"])("rejects %s", (input) => {
    expect(safeRedirectPath(input)).toBe("/dashboard");
  });

  it("keeps ordinary encoded query values", () => {
    expect(safeRedirectPath("/invite/abc?next=%2Fdashboard")).toBe("/invite/abc?next=%2Fdashboard");
  });
});

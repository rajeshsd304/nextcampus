import { describe, expect, it, vi } from "vitest";
import { auditActionLabel, auditMetadataSummary } from "@/features/audit/labels";
import { ResendEmailProvider } from "@/lib/email/providers";
import { invitationEmail } from "@/lib/email/templates";
import { parseServerEnv } from "@/lib/env";
import { formatRelativeTime, initials, slugify } from "@/lib/utils";

describe("utils", () => {
  it("slugifies names into valid workspace addresses", () => {
    expect(slugify("Northbridge University")).toBe("northbridge-university");
    expect(slugify("  École   Supérieure!! ")).toBe("ecole-superieure");
    expect(slugify("a".repeat(60))).toHaveLength(48);
    expect(slugify("---")).toBe("");
  });

  it("builds initials", () => {
    expect(initials("Ada Byron Lovelace")).toBe("AL");
    expect(initials("ada")).toBe("A");
    expect(initials("")).toBe("?");
  });

  it("formats relative time", () => {
    const now = new Date("2026-10-29T12:00:00Z");
    expect(formatRelativeTime("2026-10-29T11:59:30Z", now)).toBe("just now");
    expect(formatRelativeTime("2026-10-29T10:00:00Z", now)).toBe("2 hours ago");
    expect(formatRelativeTime("2026-10-27T12:00:00Z", now)).toBe("2 days ago");
  });
});

describe("server env", () => {
  it("defaults to the console email provider", () => {
    expect(parseServerEnv({}).EMAIL_PROVIDER).toBe("console");
  });

  it("requires an API key for resend", () => {
    expect(() => parseServerEnv({ EMAIL_PROVIDER: "resend" })).toThrow(/RESEND_API_KEY/);
    expect(parseServerEnv({ EMAIL_PROVIDER: "resend", RESEND_API_KEY: "re_x" }).RESEND_API_KEY).toBe("re_x");
  });

  it("rejects unknown providers", () => {
    expect(() => parseServerEnv({ EMAIL_PROVIDER: "carrier-pigeon" })).toThrow();
  });
});

describe("email", () => {
  it("escapes user-controlled content in invitation emails", () => {
    const message = invitationEmail({
      to: "a@b.co",
      organizationName: "<script>alert(1)</script>",
      roleLabel: "Student",
      inviterName: 'Eve "the" Admin',
      acceptUrl: "http://localhost:3000/invite/abc",
      expiresAt: "2026-11-05T00:00:00Z",
    });
    expect(message.html).not.toContain("<script>");
    expect(message.html).toContain("&#60;script&#62;");
    expect(message.text).toContain("http://localhost:3000/invite/abc");
  });

  it("sends through the Resend API and reports failures without throwing", async () => {
    const fetchOk = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify({ id: "em_1" }), { status: 200 }));
    const provider = new ResendEmailProvider("re_key", "NextCampus <a@b.co>", fetchOk);
    await expect(provider.send({ to: "x@y.co", subject: "s", html: "<p>h</p>", text: "t" })).resolves.toEqual(
      { ok: true, id: "em_1" },
    );
    const [, init] = fetchOk.mock.calls[0]!;
    expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer re_key");

    const fetchFail = vi.fn<typeof fetch>().mockResolvedValue(new Response("nope", { status: 422 }));
    await expect(
      new ResendEmailProvider("k", "f", fetchFail).send({ to: "x@y.co", subject: "s", html: "h", text: "t" }),
    ).resolves.toEqual({
      ok: false,
      reason: "resend_http_422",
    });

    const fetchThrow = vi.fn<typeof fetch>().mockRejectedValue(new TypeError("network"));
    await expect(
      new ResendEmailProvider("k", "f", fetchThrow).send({
        to: "x@y.co",
        subject: "s",
        html: "h",
        text: "t",
      }),
    ).resolves.toEqual({
      ok: false,
      reason: "TypeError",
    });
  });
});

describe("audit labels", () => {
  it("labels known actions and summarizes metadata", () => {
    expect(auditActionLabel("member.role_changed")).toBe("Member role changed");
    expect(auditActionLabel("custom.thing")).toBe("custom.thing");
    expect(auditMetadataSummary("member.role_changed", { from: "student", to: "org_admin" })).toBe(
      "student → org admin",
    );
    expect(auditMetadataSummary("organization.updated", { changes: { name: {}, website: {} } })).toBe(
      "Changed name, website",
    );
    expect(auditMetadataSummary("invitation.created", { email: "a@b.co", role: "student" })).toBe(
      "a@b.co · student",
    );
    expect(auditMetadataSummary("x.y", null)).toBeNull();
  });
});

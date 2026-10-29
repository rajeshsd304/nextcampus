import { describe, expect, it } from "vitest";
import { newPasswordFormSchema, signInSchema, signUpSchema } from "@/features/auth/schemas";
import { contactSchema } from "@/features/contact/schemas";
import { createInvitationSchema } from "@/features/invitations/schemas";
import {
  createOrganizationSchema,
  slugSchema,
  updateOrganizationSchema,
} from "@/features/organizations/schemas";
import { profileSchema } from "@/features/profiles/schemas";

describe("auth schemas", () => {
  it("normalizes email and requires a password", () => {
    const parsed = signInSchema.parse({ email: "  Ada@Example.COM ", password: "x" });
    expect(parsed.email).toBe("ada@example.com");
    expect(signInSchema.safeParse({ email: "ada@example.com", password: "" }).success).toBe(false);
  });

  it("enforces password strength and terms acceptance on sign-up", () => {
    const base = { fullName: "Ada Lovelace", email: "ada@example.com", acceptTerms: true };
    expect(signUpSchema.safeParse({ ...base, password: "short1" }).success).toBe(false);
    expect(signUpSchema.safeParse({ ...base, password: "onlyletterslong" }).success).toBe(false);
    expect(signUpSchema.safeParse({ ...base, password: "a".repeat(73) + "1" }).success).toBe(false);
    expect(signUpSchema.safeParse({ ...base, password: "correct-horse-9" }).success).toBe(true);
    expect(signUpSchema.safeParse({ ...base, acceptTerms: false, password: "correct-horse-9" }).success).toBe(
      false,
    );
  });

  it("requires matching passwords", () => {
    const result = newPasswordFormSchema.safeParse({
      password: "correct-horse-9",
      confirmPassword: "correct-horse-8",
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.path).toEqual(["confirmPassword"]);
  });
});

describe("organization schemas", () => {
  it.each(["northbridge", "apex-coaching", "a1b", "x".repeat(48)])("accepts slug %s", (slug) => {
    expect(slugSchema.safeParse(slug).success).toBe(true);
  });

  it.each(["ab", "-abc", "abc-", "a--b", "Has Space", "admin", "x".repeat(49), "ünï"])(
    "rejects slug %s",
    (slug) => {
      expect(slugSchema.safeParse(slug).success).toBe(false);
    },
  );

  it("validates create and update payloads", () => {
    expect(
      createOrganizationSchema.safeParse({ name: "Northbridge", slug: "northbridge", type: "university" })
        .success,
    ).toBe(true);
    expect(
      createOrganizationSchema.safeParse({ name: "N", slug: "northbridge", type: "university" }).success,
    ).toBe(false);
    expect(createOrganizationSchema.safeParse({ name: "North", slug: "north", type: "castle" }).success).toBe(
      false,
    );

    const update = {
      organizationId: "10000000-0000-4000-8000-000000000001",
      name: "North",
      type: "university" as const,
    };
    expect(updateOrganizationSchema.safeParse({ ...update, website: "", contactEmail: "" }).success).toBe(
      true,
    );
    expect(
      updateOrganizationSchema.safeParse({ ...update, website: "ftp://x", contactEmail: "" }).success,
    ).toBe(false);
    expect(updateOrganizationSchema.safeParse({ ...update, website: "", contactEmail: "nope" }).success).toBe(
      false,
    );
    expect(
      updateOrganizationSchema.safeParse({
        ...update,
        organizationId: "not-a-uuid",
        website: "",
        contactEmail: "",
      }).success,
    ).toBe(false);
  });
});

describe("other schemas", () => {
  it("validates invitations", () => {
    const orgId = "10000000-0000-4000-8000-000000000001";
    expect(
      createInvitationSchema.safeParse({ organizationId: orgId, email: "a@b.co", role: "student" }).success,
    ).toBe(true);
    expect(
      createInvitationSchema.safeParse({ organizationId: orgId, email: "a@b.co", role: "super_admin" })
        .success,
    ).toBe(false);
  });

  it("validates profiles and time zones", () => {
    expect(
      profileSchema.safeParse({ fullName: "Ada", displayName: "", timezone: "Asia/Dhaka" }).success,
    ).toBe(true);
    expect(
      profileSchema.safeParse({ fullName: "Ada", displayName: "", timezone: "Mars/Olympus" }).success,
    ).toBe(false);
    expect(profileSchema.safeParse({ fullName: " ", displayName: "", timezone: "UTC" }).success).toBe(false);
  });

  it("flags the contact-form honeypot", () => {
    const base = {
      name: "Ada",
      email: "ada@example.com",
      organization: "",
      topic: "sales",
      message: "We would like a demo.",
    };
    expect(contactSchema.safeParse(base).success).toBe(true);
    const bot = contactSchema.safeParse({ ...base, website: "http://spam" });
    expect(bot.success).toBe(false);
    if (!bot.success) expect(bot.error.issues[0]?.path).toEqual(["website"]);
  });
});

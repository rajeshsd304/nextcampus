import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { verifyOtpSchema } from "@/features/auth/schemas";
import { MAX_ADDITIONAL_ADMINS, MAX_PLATFORM_ADMINS } from "@/features/platform-admins/constants";
import { errorCodeFromAuth } from "@/lib/errors";

const config = readFileSync("supabase/config.toml", "utf8");

function section(name: string): string {
  const start = config.indexOf(`[${name}]`);
  expect(start, name).toBeGreaterThanOrEqual(0);
  const rest = config.slice(start + name.length + 2);
  const next = rest.search(/^\[/m);
  return next === -1 ? rest : rest.slice(0, next);
}

describe("email OTP verification", () => {
  it("accepts exactly six digits and normalizes the email", () => {
    expect(verifyOtpSchema.parse({ email: " Me@Example.COM ", token: " 123456 " })).toEqual({
      email: "me@example.com",
      token: "123456",
    });
    for (const token of ["12345", "1234567", "12a456", "", "١٢٣٤٥٦"]) {
      const result = verifyOtpSchema.safeParse({ email: "me@example.com", token });
      expect(result.success, token).toBe(false);
      if (!result.success) expect(result.error.issues[0]?.message).toBe("validation.otpFormat");
    }
  });

  it("maps Supabase OTP and rate-limit errors to friendly codes", () => {
    expect(errorCodeFromAuth({ code: "otp_expired", status: 403 })).toBe("otp_invalid");
    expect(errorCodeFromAuth({ code: "over_email_send_rate_limit", status: 429 })).toBe("rate_limited");
    expect(errorCodeFromAuth({ code: "email_not_confirmed" })).toBe("email_not_confirmed");
  });

  it("the confirmation email contains the one-time code and the fallback link", () => {
    const template = readFileSync("supabase/templates/confirmation.html", "utf8");
    expect(template).toContain("{{ .Token }}");
    expect(template).toContain("{{ .TokenHash }}");
  });

  it("keeps confirmations on and the UI cooldown in sync with the server", async () => {
    const email = section("auth.email");
    expect(email).toMatch(/^enable_confirmations = true$/m);
    expect(email).toMatch(/^otp_length = 6$/m);
    const seconds = Number(/^max_frequency = "(\d+)s"$/m.exec(email)?.[1]);
    const { RESEND_COOLDOWN_SECONDS } = await import("@/features/auth/components/otp-form");
    expect(RESEND_COOLDOWN_SECONDS).toBe(seconds);
  });
});

describe("secrets and provider configuration", () => {
  it("reads Google OAuth credentials only from env(), never literals", () => {
    const google = section("auth.external.google");
    expect(google).toMatch(/^client_id = "env\(SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID\)"$/m);
    expect(google).toMatch(/^secret = "env\(SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET\)"$/m);
  });

  it("never hard-codes an SMTP password", () => {
    expect(config).not.toMatch(/^\s*pass\s*=\s*"(?!env\()/m);
  });

  it("documents the four-admin model", () => {
    expect(MAX_PLATFORM_ADMINS).toBe(4);
    expect(MAX_ADDITIONAL_ADMINS).toBe(3);
  });
});

import { describe, expect, it } from "vitest";
import { fail, invalid, ok } from "@/lib/action-result";
import { ERROR_MESSAGES, errorCodeFromAuth, errorCodeFromDatabase } from "@/lib/errors";
import { z } from "zod";

describe("errorCodeFromDatabase", () => {
  it("maps RPC exception messages to codes", () => {
    expect(errorCodeFromDatabase({ message: "last_admin", code: "P0001" })).toBe("last_admin");
    expect(errorCodeFromDatabase({ message: "invitation_email_mismatch", code: "42501" })).toBe(
      "invitation_email_mismatch",
    );
  });

  it("falls back on SQLSTATE and never leaks raw messages", () => {
    expect(
      errorCodeFromDatabase({ message: "permission denied for table organizations", code: "42501" }),
    ).toBe("not_authorized");
    expect(errorCodeFromDatabase({ message: "new row violates check constraint", code: "23514" })).toBe(
      "invalid_input",
    );
    expect(errorCodeFromDatabase({ message: "boom", code: "XX000" })).toBe("unexpected");
    expect(errorCodeFromDatabase(null)).toBe("unexpected");
  });
});

describe("errorCodeFromAuth", () => {
  it("maps Supabase Auth codes", () => {
    expect(errorCodeFromAuth({ code: "invalid_credentials" })).toBe("invalid_credentials");
    expect(errorCodeFromAuth({ code: "email_exists" })).toBe("user_already_exists");
    expect(errorCodeFromAuth({ code: "over_email_send_rate_limit" })).toBe("rate_limited");
    expect(errorCodeFromAuth({ status: 429 })).toBe("rate_limited");
    expect(errorCodeFromAuth({ code: "something_new" })).toBe("unexpected");
  });
});

describe("ActionResult helpers", () => {
  it("builds success and failure results", () => {
    expect(ok(1, "done")).toEqual({ ok: true, data: 1, message: "done" });
    expect(fail("not_authorized")).toEqual({
      ok: false,
      error: { code: "not_authorized", message: ERROR_MESSAGES.not_authorized },
    });
  });

  it("collects zod issues per field", () => {
    const result = z
      .object({ email: z.email(), name: z.string().min(2) })
      .safeParse({ email: "x", name: "" });
    if (result.success) throw new Error("expected failure");
    const action = invalid(result.error);
    expect(action.ok).toBe(false);
    if (!action.ok) {
      expect(Object.keys(action.error.fieldErrors ?? {}).sort()).toEqual(["email", "name"]);
      expect(action.error.code).toBe("invalid_input");
    }
  });
});

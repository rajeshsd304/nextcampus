import type { z } from "zod";
import { ERROR_MESSAGES, type ErrorCode } from "./errors";

export type FieldErrors = Record<string, string[] | undefined>;

export type ActionResult<T = undefined> =
  | { ok: true; data: T; message?: string }
  | { ok: false; error: { code: ErrorCode; message: string; fieldErrors?: FieldErrors } };

export function ok<T>(data: T, message?: string): ActionResult<T> {
  return message === undefined ? { ok: true, data } : { ok: true, data, message };
}

export function fail<T = never>(code: ErrorCode, fieldErrors?: FieldErrors): ActionResult<T> {
  return {
    ok: false,
    error: fieldErrors
      ? { code, message: ERROR_MESSAGES[code], fieldErrors }
      : { code, message: ERROR_MESSAGES[code] },
  };
}

export function invalid<T = never>(error: z.ZodError): ActionResult<T> {
  const fieldErrors: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    (fieldErrors[key] ??= []).push(issue.message);
  }
  return fail<T>("invalid_input", fieldErrors);
}

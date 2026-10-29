import en from "../../messages/en.json";

/**
 * Stable error codes shared by database RPCs (raised as exception messages)
 * and server actions. User-facing text lives in messages/<locale>.json under
 * `errors.<code>`; Client Components translate the code. ERROR_MESSAGES is the
 * English text, used where no translator is available (logs, tests).
 */
export const ERROR_MESSAGES = en.errors;

export type ErrorCode = keyof typeof ERROR_MESSAGES;

export function isErrorCode(value: string): value is ErrorCode {
  return Object.hasOwn(ERROR_MESSAGES, value);
}

/** Maps a PostgREST/RPC error (whose message is our code) to an ErrorCode. */
export function errorCodeFromDatabase(
  error: { message?: string; code?: string } | null | undefined,
): ErrorCode {
  const message = error?.message?.trim() ?? "";
  if (isErrorCode(message)) return message;
  if (error?.code === "42501") return "not_authorized";
  if (error?.code === "23514" || error?.code === "22P02") return "invalid_input";
  if (error?.code === "23505") return "already_exists";
  if (error?.code === "23503") return "in_use";
  return "unexpected";
}

/** Maps Supabase Auth error codes to ErrorCode. */
export function errorCodeFromAuth(error: { code?: string; status?: number } | null | undefined): ErrorCode {
  switch (error?.code) {
    case "invalid_credentials":
      return "invalid_credentials";
    case "email_not_confirmed":
      return "email_not_confirmed";
    case "user_already_exists":
    case "email_exists":
      return "user_already_exists";
    case "weak_password":
      return "weak_password";
    case "same_password":
      return "same_password";
    case "reauthentication_needed":
    case "reauthentication_not_valid":
      return "reauthentication_needed";
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return "rate_limited";
    default:
      return error?.status === 429 ? "rate_limited" : "unexpected";
  }
}

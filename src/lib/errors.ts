/**
 * Stable error codes shared by database RPCs (raised as exception messages)
 * and server actions. Messages are safe to show to end users.
 */
export const ERROR_MESSAGES = {
  not_authenticated: "Please sign in to continue.",
  not_authorized: "You do not have permission to do that.",
  profile_incomplete: "Complete your profile before continuing.",
  invalid_input: "Some of the information provided is invalid.",
  invalid_timezone: "Choose a valid time zone.",
  invalid_slug: "Use 3–48 lowercase letters, numbers and single hyphens.",
  slug_reserved: "That address is reserved. Please choose another.",
  slug_taken: "That address is already in use. Please choose another.",
  organization_limit_reached: "You have reached the limit of organizations you can create.",
  organization_not_found: "Organization not found.",
  organization_inactive: "This organization is currently suspended.",
  invalid_email: "Enter a valid email address.",
  already_member: "This person is already a member of the organization.",
  invitation_not_found: "This invitation could not be found.",
  invitation_not_pending: "This invitation has already been used, declined or revoked.",
  invitation_expired: "This invitation has expired. Ask an administrator for a new one.",
  invitation_email_mismatch: "This invitation was sent to a different email address.",
  email_not_verified: "Verify your email address before accepting invitations.",
  last_admin: "An organization must keep at least one administrator.",
  member_not_found: "That member could not be found.",
  rate_limited: "Too many requests. Please wait a moment and try again.",
  invalid_credentials: "Incorrect email or password.",
  email_not_confirmed: "Confirm your email address, then sign in.",
  user_already_exists: "An account with this email already exists. Try signing in.",
  weak_password: "Choose a stronger password.",
  same_password: "Your new password must be different from the current one.",
  reauthentication_needed: "For your security, sign in again before changing your password.",
  unexpected: "Something went wrong. Please try again.",
} as const;

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

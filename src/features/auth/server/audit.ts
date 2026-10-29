import "server-only";
import type { SupabaseServerClient } from "@/lib/supabase/server";

export type AuthEvent = "auth.sign_in" | "auth.sign_out" | "auth.password_changed" | "auth.email_verified";
export type AuthMethod = "password" | "google" | "email_link" | "recovery";

/**
 * Records a security event for the current session. Failures are logged but
 * never block authentication.
 */
export async function logAuthEvent(
  supabase: SupabaseServerClient,
  event: AuthEvent,
  method?: AuthMethod,
): Promise<void> {
  const { error } = await supabase.rpc(
    "log_auth_event",
    method ? { p_event: event, p_method: method } : { p_event: event },
  );
  if (error) console.error(`[audit] failed to record ${event}: ${error.message}`);
}

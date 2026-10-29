import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getPublicEnv } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * Anonymous, cookie-less client for public reference data (the catalog). It
 * always queries as `anon`, so RLS returns active rows only — even when a
 * platform admin is browsing the public site.
 */
export function createPublicSupabaseClient() {
  const env = getPublicEnv();
  return createClient<Database>(env.supabaseUrl, env.supabasePublishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { emailSchema } from "@/features/auth/schemas";
import { getViewer } from "@/features/auth/server/session";
import { fail, invalid, ok, type ActionResult } from "@/lib/action-result";
import { errorCodeFromDatabase } from "@/lib/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Only the primary admin may manage platform admins. This check gives a clear
 * error early; public.grant_platform_admin / revoke_platform_admin re-check it
 * in the database (private.is_primary_admin()) and enforce the four-seat limit.
 */
async function primaryAdminOnly(): Promise<boolean> {
  const viewer = await getViewer();
  return Boolean(viewer?.isPrimaryAdmin && viewer.user.emailConfirmed);
}

export async function grantPlatformAdminAction(input: unknown): Promise<ActionResult> {
  const parsed = z.object({ email: emailSchema }).safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  if (!(await primaryAdminOnly())) return fail("not_authorized");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("grant_platform_admin", { p_email: parsed.data.email });
  if (error) return fail(errorCodeFromDatabase(error));

  revalidatePath("/platform", "layout");
  return ok(undefined, "platformAdmins.granted");
}

export async function revokePlatformAdminAction(input: unknown): Promise<ActionResult> {
  const parsed = z.object({ userId: z.uuid() }).safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  if (!(await primaryAdminOnly())) return fail("not_authorized");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("revoke_platform_admin", { p_user_id: parsed.data.userId });
  if (error) return fail(errorCodeFromDatabase(error));

  revalidatePath("/platform", "layout");
  return ok(undefined, "platformAdmins.revoked");
}

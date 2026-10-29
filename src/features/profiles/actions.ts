"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { fail, invalid, ok, type ActionResult } from "@/lib/action-result";
import { errorCodeFromDatabase } from "@/lib/errors";
import { safeRedirectPath } from "@/lib/redirect";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { profileSchema, profileSettingsSchema } from "./schemas";

export async function completeOnboardingAction(input: unknown, next?: string): Promise<ActionResult> {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("complete_onboarding", {
    p_full_name: parsed.data.fullName,
    p_display_name: parsed.data.displayName,
    p_timezone: parsed.data.timezone,
  });
  if (error) return fail(errorCodeFromDatabase(error));

  revalidatePath("/", "layout");
  redirect(safeRedirectPath(next));
}

export async function updateProfileAction(input: unknown): Promise<ActionResult> {
  const parsed = profileSettingsSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return fail("not_authenticated");

  // RLS limits this to the caller's row; column grants limit the fields.
  const { data, error } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.fullName,
      display_name: parsed.data.displayName || null,
      timezone: parsed.data.timezone,
      marketing_opt_in: parsed.data.marketingOptIn,
    })
    .eq("id", auth.user.id)
    .select("id");
  if (error) return fail(errorCodeFromDatabase(error));
  if (data.length === 0) return fail("not_authorized");

  revalidatePath("/", "layout");
  return ok(undefined, "profileForm.saved");
}

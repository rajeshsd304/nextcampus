"use server";

import { revalidatePath } from "next/cache";
import { fail, invalid, ok, type ActionResult } from "@/lib/action-result";
import { errorCodeFromDatabase } from "@/lib/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { preferencesSchema } from "./schemas";
import { writePreferenceCookies } from "./server";

/** Saves language/digit preferences to cookies and, when signed in, to the profile. */
export async function updatePreferencesAction(input: unknown): Promise<ActionResult> {
  const parsed = preferencesSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { locale, numerals } = parsed.data;

  await writePreferenceCookies({ locale, numerals });

  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (auth.user) {
    const { error } = await supabase
      .from("profiles")
      .update({
        ...(locale ? { preferred_locale: locale } : {}),
        ...(numerals ? { preferred_numerals: numerals } : {}),
      })
      .eq("id", auth.user.id);
    if (error) return fail(errorCodeFromDatabase(error));
  }

  revalidatePath("/", "layout");
  return ok(undefined, "profileForm.preferences.saved");
}

/** Progressive-enhancement entry point for the language switcher form. */
export async function switchLocaleFormAction(formData: FormData): Promise<void> {
  await updatePreferencesAction({ locale: formData.get("locale") ?? undefined });
}

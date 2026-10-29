"use server";

import { redirect } from "next/navigation";
import { fail, invalid, ok, type ActionResult } from "@/lib/action-result";
import { getPublicEnv } from "@/lib/env";
import { errorCodeFromAuth } from "@/lib/errors";
import { safeRedirectPath } from "@/lib/redirect";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { syncPreferencesAfterSignIn } from "@/features/preferences/server";
import { logAuthEvent } from "./server/audit";
import { forgotPasswordSchema, newPasswordFormSchema, signInSchema, signUpSchema } from "./schemas";

export async function signInWithPasswordAction(input: unknown): Promise<ActionResult> {
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error) return fail(errorCodeFromAuth(error));

  await logAuthEvent(supabase, "auth.sign_in", "password");
  await syncPreferencesAfterSignIn(supabase, data.user.id);
  redirect(safeRedirectPath(parsed.data.next));
}

export async function signUpAction(input: unknown): Promise<ActionResult<{ email: string }>> {
  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const { siteUrl } = getPublicEnv();
  const next = safeRedirectPath(parsed.data.next, { fallback: "/onboarding" });
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      // The confirmation email links to /auth/confirm with this as `next`.
      emailRedirectTo: `${siteUrl}${next}`,
    },
  });
  if (error) return fail(errorCodeFromAuth(error));

  // When email confirmation is disabled Supabase returns a session immediately.
  if (data.session && data.user) {
    await logAuthEvent(supabase, "auth.sign_in", "password");
    await syncPreferencesAfterSignIn(supabase, data.user.id);
    redirect(next);
  }

  // Same response whether or not the address already has an account, to
  // avoid account enumeration.
  return ok({ email: parsed.data.email });
}

export async function signInWithGoogleAction(formData: FormData): Promise<void> {
  const next = safeRedirectPath(
    typeof formData.get("next") === "string" ? String(formData.get("next")) : null,
  );
  const { siteUrl } = getPublicEnv();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent(next)}`,
      queryParams: { prompt: "select_account" },
    },
  });
  if (error || !data.url) redirect("/sign-in?error=oauth_unavailable");
  redirect(data.url);
}

export async function requestPasswordResetAction(input: unknown): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const { siteUrl } = getPublicEnv();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${siteUrl}/reset-password`,
  });
  if (error && errorCodeFromAuth(error) === "rate_limited") return fail("rate_limited");
  // Always succeed otherwise, so the response does not reveal whether an account exists.
  return ok(undefined);
}

export async function updatePasswordAction(input: unknown): Promise<ActionResult> {
  const parsed = newPasswordFormSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return fail("not_authenticated");

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return fail(errorCodeFromAuth(error));

  await logAuthEvent(supabase, "auth.password_changed");
  return ok(undefined, "authForms.passwordUpdated");
}

export async function resendConfirmationAction(input: unknown): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { siteUrl } = getPublicEnv();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: parsed.data.email,
    options: { emailRedirectTo: `${siteUrl}/onboarding` },
  });
  if (error && errorCodeFromAuth(error) === "rate_limited") return fail("rate_limited");
  return ok(undefined, "authForms.confirmationResent");
}

export async function signOutAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (data.user) await logAuthEvent(supabase, "auth.sign_out");
  await supabase.auth.signOut();
  redirect("/");
}

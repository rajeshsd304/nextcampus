"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ORG_ROLE_DISPLAY, ROLE_HOME_AREA } from "@/features/access/roles";
import { getViewer, viewerDisplayName } from "@/features/auth/server/session";
import { fail, invalid, ok, type ActionResult } from "@/lib/action-result";
import { getEmailProvider } from "@/lib/email";
import { invitationEmail } from "@/lib/email/templates";
import { getPublicEnv } from "@/lib/env";
import { errorCodeFromDatabase } from "@/lib/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createInvitationSchema, invitationIdSchema, invitationTokenSchema } from "./schemas";

export type CreatedInvitation = { inviteUrl: string; email: string; emailSent: boolean; expiresAt: string };

export async function createInvitationAction(input: unknown): Promise<ActionResult<CreatedInvitation>> {
  const parsed = createInvitationSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const viewer = await getViewer();
  if (!viewer) return fail("not_authenticated");

  const supabase = await createSupabaseServerClient();
  // Authorization (invitations.manage), validation and auditing happen in the RPC.
  const { data, error } = await supabase.rpc("create_invitation", {
    p_organization_id: parsed.data.organizationId,
    p_email: parsed.data.email,
    p_role: parsed.data.role,
  });
  if (error) {
    const code = errorCodeFromDatabase(error);
    return code === "already_member" || code === "invalid_email"
      ? fail(code, {
          email: [code === "already_member" ? "errors.already_member" : "validation.emailInvalid"],
        })
      : fail(code);
  }
  const invitation = data[0];
  if (!invitation) return fail("unexpected");

  const membership = viewer.memberships.find((m) => m.organizationId === parsed.data.organizationId);
  const inviteUrl = `${getPublicEnv().siteUrl}/invite/${invitation.invitation_token}`;
  // The email is written in the inviter's current language.
  const [tEmail, tRoles] = await Promise.all([getTranslations("email.invitation"), getTranslations("roles")]);
  const sendResult = await getEmailProvider().send(
    invitationEmail(
      {
        to: parsed.data.email,
        organizationName: membership?.organization.name ?? tEmail("fallbackOrganization"),
        roleLabel: tRoles(`${ORG_ROLE_DISPLAY[parsed.data.role]}.label`),
        inviterName: viewerDisplayName(viewer),
        acceptUrl: inviteUrl,
        expiresAt: invitation.invitation_expires_at,
      },
      {
        subject: (values) => tEmail("subject", values),
        body: (values) => tEmail("body", values),
        button: tEmail("button"),
        footer: (values) => tEmail("footer", values),
        tagline: tEmail("tagline"),
      },
    ),
  );
  if (!sendResult.ok) console.error(`[invitations] email delivery failed: ${sendResult.reason}`);

  if (membership) revalidatePath(`/o/${membership.organization.slug}/admin`, "layout");
  return ok(
    {
      inviteUrl,
      email: parsed.data.email,
      emailSent: sendResult.ok,
      expiresAt: invitation.invitation_expires_at,
    },
    sendResult.ok ? "invitationForms.sent" : "invitationForms.emailFailed",
  );
}

export async function revokeInvitationAction(input: unknown): Promise<ActionResult> {
  const parsed = invitationIdSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("revoke_invitation", { p_invitation_id: parsed.data.invitationId });
  if (error) return fail(errorCodeFromDatabase(error));

  revalidatePath("/", "layout");
  return ok(undefined, "invitationForms.revoked");
}

export async function acceptInvitationByTokenAction(input: unknown): Promise<ActionResult> {
  const parsed = invitationTokenSchema.safeParse(input);
  if (!parsed.success) return fail("invitation_not_found");

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("accept_invitation", { p_token: parsed.data.token });
  if (error) return fail(errorCodeFromDatabase(error));
  const accepted = data[0];
  if (!accepted) return fail("unexpected");

  revalidatePath("/", "layout");
  redirect(`/o/${accepted.organization_slug}/${ROLE_HOME_AREA[accepted.member_role]}`);
}

export async function acceptInvitationByIdAction(input: unknown): Promise<ActionResult> {
  const parsed = invitationIdSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("accept_invitation_by_id", {
    p_invitation_id: parsed.data.invitationId,
  });
  if (error) return fail(errorCodeFromDatabase(error));
  const accepted = data[0];
  if (!accepted) return fail("unexpected");

  revalidatePath("/", "layout");
  redirect(`/o/${accepted.organization_slug}/${ROLE_HOME_AREA[accepted.member_role]}`);
}

export async function declineInvitationAction(input: unknown): Promise<ActionResult> {
  const parsed = invitationIdSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("decline_invitation", { p_invitation_id: parsed.data.invitationId });
  if (error) return fail(errorCodeFromDatabase(error));

  revalidatePath("/", "layout");
  return ok(undefined, "invitationForms.declined");
}

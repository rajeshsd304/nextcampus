"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { ROLE_HOME_AREA } from "@/features/access/roles";
import { fail, invalid, ok, type ActionResult } from "@/lib/action-result";
import { errorCodeFromDatabase } from "@/lib/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  createOrganizationSchema,
  memberTargetSchema,
  updateMemberRoleSchema,
  updateOrganizationSchema,
} from "./schemas";

export async function createOrganizationAction(input: unknown): Promise<ActionResult> {
  const parsed = createOrganizationSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("create_organization", {
    p_name: parsed.data.name,
    p_slug: parsed.data.slug,
    p_type: parsed.data.type,
  });
  if (error) {
    const code = errorCodeFromDatabase(error);
    if (code === "slug_taken" || code === "slug_reserved" || code === "invalid_slug") {
      return fail(code, {
        slug: [
          code === "invalid_slug"
            ? "validation.slugPattern"
            : code === "slug_taken"
              ? "errors.slug_taken"
              : "validation.slugReserved",
        ],
      });
    }
    return fail(code);
  }
  const created = data[0];
  if (!created) return fail("unexpected");

  revalidatePath("/", "layout");
  redirect(`/o/${created.organization_slug}/${ROLE_HOME_AREA.org_admin}`);
}

export async function updateOrganizationAction(input: unknown): Promise<ActionResult> {
  const parsed = updateOrganizationSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createSupabaseServerClient();
  // RLS (org.update) and column grants are the enforcement point; zero rows
  // updated means the caller is not permitted.
  const { data, error } = await supabase
    .from("organizations")
    .update({
      name: parsed.data.name,
      type: parsed.data.type,
      website: parsed.data.website || null,
      contact_email: parsed.data.contactEmail || null,
    })
    .eq("id", parsed.data.organizationId)
    .select("slug");
  if (error) return fail(errorCodeFromDatabase(error));
  const row = data[0];
  if (!row) return fail("not_authorized");

  revalidatePath(`/o/${row.slug}`, "layout");
  return ok(undefined, "orgForms.detailsSaved");
}

export async function updateMemberRoleAction(input: unknown): Promise<ActionResult> {
  const parsed = updateMemberRoleSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("update_member_role", {
    p_organization_id: parsed.data.organizationId,
    p_user_id: parsed.data.userId,
    p_role: parsed.data.role,
  });
  if (error) return fail(errorCodeFromDatabase(error));

  revalidatePath("/", "layout");
  return ok(undefined, "orgForms.roleUpdated");
}

export async function removeMemberAction(input: unknown): Promise<ActionResult> {
  const parsed = memberTargetSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("remove_member", {
    p_organization_id: parsed.data.organizationId,
    p_user_id: parsed.data.userId,
  });
  if (error) return fail(errorCodeFromDatabase(error));

  revalidatePath("/", "layout");
  return ok(undefined, "orgForms.memberRemoved");
}

export async function leaveOrganizationAction(input: unknown): Promise<ActionResult> {
  const parsed = z.object({ organizationId: z.uuid() }).safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return fail("not_authenticated");

  const { error } = await supabase.rpc("remove_member", {
    p_organization_id: parsed.data.organizationId,
    p_user_id: auth.user.id,
  });
  if (error) return fail(errorCodeFromDatabase(error));

  revalidatePath("/", "layout");
  return ok(undefined, "orgForms.left");
}

export async function setOrganizationStatusAction(input: unknown): Promise<ActionResult> {
  const parsed = z
    .object({ organizationId: z.uuid(), status: z.enum(["active", "suspended"]) })
    .safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("set_organization_status", {
    p_organization_id: parsed.data.organizationId,
    p_status: parsed.data.status,
  });
  if (error) return fail(errorCodeFromDatabase(error));

  revalidatePath("/platform");
  return ok(undefined, parsed.data.status === "suspended" ? "orgForms.suspended" : "orgForms.reactivated");
}

/** Joins the public practice organization (idempotent; audited by the RPC). */
export async function joinPublicOrganizationAction(): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("join_public_organization");
  if (error) return fail(errorCodeFromDatabase(error));
  const joined = data[0];
  if (!joined) return fail("unexpected");

  revalidatePath("/", "layout");
  redirect(`/o/${joined.organization_slug}/${ROLE_HOME_AREA.student}`);
}

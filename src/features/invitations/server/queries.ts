import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database, Tables } from "@/types/database";

export type MyInvitation = Database["public"]["Functions"]["list_my_invitations"]["Returns"][number];
export type InvitationPreview = Database["public"]["Functions"]["get_invitation_preview"]["Returns"][number];

export async function listMyInvitations(): Promise<MyInvitation[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("list_my_invitations");
  if (error) throw new Error(`Failed to load invitations: ${error.message}`);
  const now = Date.now();
  return data.map((row) => ({ ...row, isExpired: new Date(row.expires_at).getTime() <= now }));
}

export async function getInvitationPreview(token: string): Promise<InvitationPreview | null> {
  if (!/^[0-9a-f]{64}$/.test(token)) return null;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("get_invitation_preview", { p_token: token });
  if (error) throw new Error(`Failed to load invitation: ${error.message}`);
  return data[0] ?? null;
}

export type OrgInvitation = Pick<
  Tables<"invitations">,
  "id" | "email" | "role" | "status" | "expires_at" | "created_at" | "responded_at"
> & { isExpired: boolean };

export async function listOrganizationInvitations(organizationId: string): Promise<OrgInvitation[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("invitations")
    .select("id, email, role, status, expires_at, created_at, responded_at")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(`Failed to load invitations: ${error.message}`);
  const now = Date.now();
  return data.map((row) => ({ ...row, isExpired: new Date(row.expires_at).getTime() <= now }));
}

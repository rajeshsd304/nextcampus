import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Enums, Tables } from "@/types/database";

export type MemberRow = {
  userId: string;
  role: Enums<"org_role">;
  status: Enums<"membership_status">;
  joinedAt: string;
  profile: Pick<Tables<"profiles">, "email" | "full_name" | "display_name" | "avatar_url"> | null;
};

/** Roster for an organization. RLS returns rows only to members with members.read. */
export async function listMembers(
  organizationId: string,
  options: { role?: Enums<"org_role"> } = {},
): Promise<MemberRow[]> {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("organization_members")
    .select(
      "user_id, role, status, joined_at, profiles!organization_members_user_id_fkey(email, full_name, display_name, avatar_url)",
    )
    .eq("organization_id", organizationId)
    .order("joined_at", { ascending: true })
    .limit(500);
  if (options.role) query = query.eq("role", options.role);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to load members: ${error.message}`);
  return data.map((row) => ({
    userId: row.user_id,
    role: row.role,
    status: row.status,
    joinedAt: row.joined_at,
    profile: row.profiles,
  }));
}

export function countByRole(members: MemberRow[]): Record<Enums<"org_role">, number> {
  const counts: Record<Enums<"org_role">, number> = {
    org_admin: 0,
    instructor: 0,
    invigilator: 0,
    student: 0,
  };
  for (const member of members) counts[member.role] += 1;
  return counts;
}

export async function getOrganization(organizationId: string): Promise<Tables<"organizations"> | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", organizationId)
    .maybeSingle();
  if (error) throw new Error(`Failed to load organization: ${error.message}`);
  return data;
}

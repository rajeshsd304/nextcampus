import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type PlatformAdminRow = {
  userId: string;
  slot: number;
  isPrimary: boolean;
  grantedAt: string;
  name: string | null;
  email: string | null;
};

/** All platform admins. RLS: platform admins can read every row and every profile. */
export async function listPlatformAdmins(): Promise<PlatformAdminRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("platform_admins")
    .select("user_id, slot, is_primary, created_at")
    .order("slot");
  if (error) throw new Error(`Failed to load platform admins: ${error.message}`);
  const ids = data.map((row) => row.user_id);
  const { data: profiles } = ids.length
    ? await supabase.from("profiles").select("id, full_name, display_name, email").in("id", ids)
    : { data: [] };
  const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
  return data.map((row) => {
    const profile = byId.get(row.user_id);
    return {
      userId: row.user_id,
      slot: row.slot,
      isPrimary: row.is_primary,
      grantedAt: row.created_at,
      name: profile ? (profile.display_name ?? profile.full_name) : null,
      email: profile?.email ?? null,
    };
  });
}

import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

export type AuditEntry = Tables<"audit_logs"> & { actorLabel: string | null };

export const AUDIT_PAGE_SIZE = 50;

async function withActorLabels(entries: Tables<"audit_logs">[]): Promise<AuditEntry[]> {
  const actorIds = [...new Set(entries.map((e) => e.actor_id).filter((id): id is string => Boolean(id)))];
  if (actorIds.length === 0) return entries.map((e) => ({ ...e, actorLabel: null }));
  const supabase = await createSupabaseServerClient();
  // RLS only returns profiles the viewer may see; others render as "Former member".
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, display_name, email")
    .in("id", actorIds);
  const labels = new Map((data ?? []).map((p) => [p.id, p.display_name ?? p.full_name ?? p.email]));
  return entries.map((e) => ({ ...e, actorLabel: e.actor_id ? (labels.get(e.actor_id) ?? null) : null }));
}

export async function listOrganizationAudit(
  organizationId: string,
  page: number,
): Promise<{ entries: AuditEntry[]; total: number }> {
  const supabase = await createSupabaseServerClient();
  const from = (page - 1) * AUDIT_PAGE_SIZE;
  const { data, error, count } = await supabase
    .from("audit_logs")
    .select("*", { count: "exact" })
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .range(from, from + AUDIT_PAGE_SIZE - 1);
  if (error) throw new Error(`Failed to load audit log: ${error.message}`);
  return { entries: await withActorLabels(data), total: count ?? 0 };
}

export async function listRecentOrganizationAudit(organizationId: string, limit = 5): Promise<AuditEntry[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("audit_logs")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Failed to load audit log: ${error.message}`);
  return withActorLabels(data);
}

/** The caller's own account-level security events (sign-ins, password changes). */
export async function listMySecurityEvents(userId: string, limit = 10): Promise<Tables<"audit_logs">[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("audit_logs")
    .select("*")
    .is("organization_id", null)
    .eq("actor_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Failed to load security events: ${error.message}`);
  return data;
}

export async function listPlatformAudit(limit = 15): Promise<AuditEntry[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("audit_logs")
    .select("*")
    .not("organization_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Failed to load audit log: ${error.message}`);
  return withActorLabels(data);
}

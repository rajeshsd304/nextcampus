import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

export type NotificationItem = Pick<
  Tables<"notifications">,
  "id" | "kind" | "title" | "body" | "action_url" | "read_at" | "created_at"
>;

const COLUMNS = "id, kind, title, body, action_url, read_at, created_at";

export async function getNotificationSummary(
  limit = 6,
): Promise<{ unreadCount: number; recent: NotificationItem[] }> {
  const supabase = await createSupabaseServerClient();
  const [countRes, recentRes] = await Promise.all([
    supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null),
    supabase.from("notifications").select(COLUMNS).order("created_at", { ascending: false }).limit(limit),
  ]);
  if (countRes.error) throw new Error(`Failed to count notifications: ${countRes.error.message}`);
  if (recentRes.error) throw new Error(`Failed to load notifications: ${recentRes.error.message}`);
  return { unreadCount: countRes.count ?? 0, recent: recentRes.data };
}

export const NOTIFICATIONS_PAGE_SIZE = 25;

export async function listNotifications(
  page: number,
  filter: "all" | "unread",
): Promise<{ items: NotificationItem[]; total: number }> {
  const supabase = await createSupabaseServerClient();
  const from = (page - 1) * NOTIFICATIONS_PAGE_SIZE;
  let query = supabase
    .from("notifications")
    .select(COLUMNS, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + NOTIFICATIONS_PAGE_SIZE - 1);
  if (filter === "unread") query = query.is("read_at", null);
  const { data, error, count } = await query;
  if (error) throw new Error(`Failed to load notifications: ${error.message}`);
  return { items: data, total: count ?? 0 };
}

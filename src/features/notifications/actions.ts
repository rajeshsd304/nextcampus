"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fail, invalid, ok, type ActionResult } from "@/lib/action-result";
import { errorCodeFromDatabase } from "@/lib/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const markReadSchema = z.object({ ids: z.array(z.uuid()).min(1).max(100).optional() });

/** Marks the caller's notifications read (all when `ids` is omitted). Timestamp is set by the database. */
export async function markNotificationsReadAction(
  input: unknown,
): Promise<ActionResult<{ updated: number }>> {
  const parsed = markReadSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc(
    "mark_notifications_read",
    parsed.data.ids ? { p_notification_ids: parsed.data.ids } : {},
  );
  if (error) return fail(errorCodeFromDatabase(error));

  revalidatePath("/", "layout");
  return ok({ updated: data });
}

export async function markAllNotificationsReadFormAction(): Promise<void> {
  await markNotificationsReadAction({});
}

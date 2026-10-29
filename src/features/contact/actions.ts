"use server";

import { fail, invalid, ok, type ActionResult } from "@/lib/action-result";
import { getEmailProvider } from "@/lib/email";
import { contactNotificationEmail } from "@/lib/email/templates";
import { getServerEnv } from "@/lib/env";
import { errorCodeFromDatabase } from "@/lib/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { contactSchema } from "./schemas";

export async function submitContactAction(input: unknown): Promise<ActionResult> {
  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) {
    // Silently accept honeypot submissions so bots get no signal.
    if (parsed.error.issues.some((issue) => issue.path[0] === "website")) return ok(undefined);
    return invalid(parsed.error);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("submit_contact_request", {
    p_name: parsed.data.name,
    p_email: parsed.data.email,
    p_organization: parsed.data.organization,
    p_topic: parsed.data.topic,
    p_message: parsed.data.message,
  });
  if (error) return fail(errorCodeFromDatabase(error));

  const inbox = getServerEnv().CONTACT_NOTIFICATION_EMAIL;
  if (inbox) {
    const result = await getEmailProvider().send(
      contactNotificationEmail({
        to: inbox,
        name: parsed.data.name,
        email: parsed.data.email,
        organization: parsed.data.organization || null,
        topic: parsed.data.topic,
        message: parsed.data.message,
      }),
    );
    if (!result.ok) console.error(`[contact] notification email failed: ${result.reason}`);
  }

  return ok(undefined, "Thanks — your message has been received. We usually reply within one business day.");
}

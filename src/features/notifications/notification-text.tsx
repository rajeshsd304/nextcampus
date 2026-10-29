import { useTranslations } from "next-intl";
import { isOrgRole, ORG_ROLE_DISPLAY } from "@/features/access/roles";
import type { NotificationItem } from "./server/queries";

const TEMPLATES = [
  "invitation_received",
  "membership_welcome",
  "invitation_accepted",
  "role_changed",
  "member_removed",
  "password_changed",
  "workspace_ready",
  "public_welcome",
  "question_rejected",
  "question_published",
  "platform_admin_granted",
  "platform_admin_revoked",
] as const;
type Template = (typeof TEMPLATES)[number];

function isTemplate(value: unknown): value is Template {
  return typeof value === "string" && (TEMPLATES as readonly string[]).includes(value);
}

function stringParam(params: NotificationItem["params"], key: string): string {
  if (!params || typeof params !== "object" || Array.isArray(params)) return "";
  const value = params[key];
  return typeof value === "string" ? value : "";
}

/**
 * Renders a notification's title or body in the reader's language. Rows
 * without a known template fall back to their stored (English) text.
 */
export function NotificationText({ item, part }: { item: NotificationItem; part: "title" | "body" }) {
  const t = useTranslations("notifications.templates");
  const tRoles = useTranslations("roles");

  if (!isTemplate(item.template)) {
    return <>{part === "title" ? item.title : item.body}</>;
  }
  const role = stringParam(item.params, "role");
  const values = {
    organization: stringParam(item.params, "organization"),
    name: stringParam(item.params, "name"),
    reason: stringParam(item.params, "reason"),
    role: isOrgRole(role) ? tRoles(`${ORG_ROLE_DISPLAY[role]}.label`) : role,
  };
  return <>{t(`${item.template}.${part}`, values)}</>;
}

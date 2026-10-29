import { History } from "lucide-react";
import { useMessages, useTranslations } from "next-intl";
import { EmptyState } from "@/components/ui/misc";
import { isOrgRole, ORG_ROLE_DISPLAY } from "@/features/access/roles";
import { formatDateTime, type FormatContext } from "@/lib/i18n-format";
import { auditMetadataParts, lookupAuditLabel } from "../labels";
import type { AuditEntry } from "../server/queries";

function useAuditSummary() {
  const t = useTranslations("audit");
  const tRoles = useTranslations("roles");
  const role = (value: string) => (isOrgRole(value) ? tRoles(`${ORG_ROLE_DISPLAY[value]}.label`) : value);

  return (entry: AuditEntry): string | null => {
    const parts = auditMetadataParts(entry.action, entry.metadata);
    if (!parts) return null;
    switch (parts.kind) {
      case "text":
        return parts.value;
      case "role":
        return role(parts.value);
      case "roleChange":
        return t("roleChange", { from: role(parts.from), to: role(parts.to) });
      case "emailRole":
        return [parts.email, parts.role ? role(parts.role) : null].filter(Boolean).join(" · ") || null;
      case "changedFields":
        return t("changedFields", {
          fields: parts.fields
            .map((f) => (t.has(`fields.${f}` as never) ? t(`fields.${f}` as never) : f))
            .join(", "),
        });
    }
  };
}

export function AuditList({
  entries,
  format,
  compact = false,
}: {
  entries: AuditEntry[];
  format: FormatContext;
  compact?: boolean;
}) {
  const t = useTranslations("audit");
  const summarize = useAuditSummary();
  // Labels are looked up dynamically because action names come from the database.
  const actionLabels = useMessages().audit.actions;

  if (entries.length === 0) {
    return <EmptyState icon={<History />} title={t("emptyTitle")} description={t("emptyDescription")} />;
  }
  return (
    <ol className="divide-border divide-y">
      {entries.map((entry) => {
        const summary = summarize(entry);
        return (
          <li
            key={entry.id}
            className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium">
                {lookupAuditLabel(actionLabels, entry.action) ?? entry.action}
                {summary ? (
                  <span className="text-muted-foreground font-normal">{` — ${summary}`}</span>
                ) : null}
              </p>
              {!compact ? (
                <p className="text-muted-foreground text-xs">
                  {t("by", { actor: entry.actorLabel ?? (entry.actor_id ? t("formerMember") : t("system")) })}
                </p>
              ) : null}
            </div>
            <time dateTime={entry.created_at} className="text-muted-foreground shrink-0 text-xs">
              {formatDateTime(entry.created_at, format)}
            </time>
          </li>
        );
      })}
    </ol>
  );
}

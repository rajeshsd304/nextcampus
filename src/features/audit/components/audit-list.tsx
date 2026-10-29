import { History } from "lucide-react";
import { EmptyState } from "@/components/ui/misc";
import { formatDateTime } from "@/lib/utils";
import { auditActionLabel, auditMetadataSummary } from "../labels";
import type { AuditEntry } from "../server/queries";

export function AuditList({
  entries,
  timeZone,
  compact = false,
}: {
  entries: AuditEntry[];
  timeZone: string;
  compact?: boolean;
}) {
  if (entries.length === 0) {
    return (
      <EmptyState
        icon={<History />}
        title="No activity yet"
        description="Administrative changes will appear here."
      />
    );
  }
  return (
    <ol className="divide-border divide-y">
      {entries.map((entry) => {
        const summary = auditMetadataSummary(entry.action, entry.metadata);
        return (
          <li
            key={entry.id}
            className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium">
                {auditActionLabel(entry.action)}
                {summary ? <span className="text-muted-foreground font-normal"> — {summary}</span> : null}
              </p>
              {!compact ? (
                <p className="text-muted-foreground text-xs">
                  by {entry.actorLabel ?? (entry.actor_id ? "Former member" : "System")}
                </p>
              ) : null}
            </div>
            <time dateTime={entry.created_at} className="text-muted-foreground shrink-0 text-xs">
              {formatDateTime(entry.created_at, timeZone)}
            </time>
          </li>
        );
      })}
    </ol>
  );
}

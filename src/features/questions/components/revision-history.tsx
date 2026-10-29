import { useTranslations } from "next-intl";
import { formatDateTime, formatNumber, type FormatContext } from "@/lib/i18n-format";
import { MathText } from "../math";
import type { RevisionEntry } from "../server/queries";
import { StatusBadge } from "./question-badges";

type Snapshot = {
  stem_bn?: string;
  stem_en?: string;
  marks?: number;
  options?: { label: string; text_bn: string; text_en: string }[];
};

function snapshotOf(value: unknown): Snapshot {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Snapshot) : {};
}

export function RevisionHistory({
  revisions,
  format,
}: {
  revisions: RevisionEntry[];
  format: FormatContext;
}) {
  const t = useTranslations("questions.history");
  if (revisions.length === 0) return <p className="text-muted-foreground text-sm">{t("empty")}</p>;
  return (
    <ol className="space-y-3">
      {revisions.map((revision) => {
        const snapshot = snapshotOf(revision.snapshot);
        return (
          <li key={revision.id} className="border-border rounded-xl border">
            <details className="group">
              <summary className="flex min-h-11 cursor-pointer list-none flex-wrap items-center justify-between gap-2 p-3 [&::-webkit-details-marker]:hidden">
                <span className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-semibold">
                    {t("revision", { number: formatNumber(revision.revision, format) })}
                  </span>
                  <span>
                    {t(
                      `kinds.${revision.change_kind === "created" ? "created" : revision.change_kind === "status" ? "status" : "content"}`,
                    )}
                  </span>
                  <StatusBadge status={revision.to_status} />
                </span>
                <span className="text-muted-foreground text-xs">
                  {t("by", {
                    actor: revision.actorLabel ?? t("system"),
                    date: formatDateTime(revision.created_at, format),
                  })}
                </span>
              </summary>
              <div className="border-border space-y-3 border-t p-3 text-sm">
                {revision.reason ? (
                  <p>
                    <span className="font-medium">{t("reason")}</span> {revision.reason}
                  </p>
                ) : null}
                {snapshot.stem_bn ? <MathText text={snapshot.stem_bn} lang="bn" /> : null}
                {snapshot.stem_en ? (
                  <MathText text={snapshot.stem_en} lang="en" className="text-muted-foreground" />
                ) : null}
                {snapshot.options?.length ? (
                  <ul className="text-muted-foreground space-y-1">
                    {snapshot.options.map((o) => (
                      <li key={o.label}>{`${o.label}. ${o.text_bn || o.text_en}`}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </details>
          </li>
        );
      })}
    </ol>
  );
}

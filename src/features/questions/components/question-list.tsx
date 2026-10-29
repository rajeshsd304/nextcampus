import { FileQuestion } from "lucide-react";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/ui/misc";
import { formatDateTime, formatNumber, type FormatContext } from "@/lib/i18n-format";
import { MathText } from "../math";
import type { QuestionListItem, Taxonomy } from "../server/queries";
import { DifficultyBadge, LanguageBadges, StatusBadge, TypeBadge } from "./question-badges";

export async function QuestionList({
  items,
  taxonomy,
  basePath,
  format,
  emptyAction,
}: {
  items: QuestionListItem[];
  taxonomy: Taxonomy;
  basePath: string;
  format: FormatContext;
  emptyAction?: React.ReactNode;
}) {
  const [t, locale] = await Promise.all([getTranslations("questions.list"), getLocale()]);
  if (items.length === 0) {
    return (
      <EmptyState
        icon={<FileQuestion />}
        title={t("emptyTitle")}
        description={t("emptyBody")}
        action={emptyAction}
      />
    );
  }
  const name = <T extends { id: string; name_bn: string; name_en: string }>(rows: T[], id: string | null) => {
    const row = id ? rows.find((r) => r.id === id) : undefined;
    return row ? (locale === "bn" ? row.name_bn : row.name_en) : null;
  };

  return (
    <ul className="divide-border border-border bg-surface divide-y rounded-2xl border">
      {items.map((item) => {
        const stem =
          (locale === "bn" ? item.stem_bn || item.stem_en : item.stem_en || item.stem_bn) || t("noStem");
        return (
          <li key={item.id} className="p-4 sm:p-5">
            <Link
              href={`${basePath}/${item.id}`}
              className="block rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4"
              aria-label={t("open")}
            >
              <MathText text={stem} className="line-clamp-3 font-medium" />
            </Link>
            <div className="text-muted-foreground mt-3 flex flex-wrap items-center gap-2 text-xs">
              <StatusBadge status={item.status} />
              <TypeBadge type={item.type} />
              <DifficultyBadge difficulty={item.difficulty} />
              <LanguageBadges bn={item.bn_complete} en={item.en_complete} />
              <span>
                {[name(taxonomy.subjects, item.subject_id), name(taxonomy.topics, item.topic_id)]
                  .filter(Boolean)
                  .join(" › ")}
              </span>
              <span>{t("marks", { marks: formatNumber(item.marks, format) })}</span>
              <span>{t("updated", { date: formatDateTime(item.updated_at, format) })}</span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

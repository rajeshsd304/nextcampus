import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import type { QuestionDifficulty, QuestionStatus, QuestionType } from "../constants";

const STATUS_TONES = {
  draft: "neutral",
  in_review: "warning",
  published: "success",
  archived: "neutral",
} as const;

export function StatusBadge({ status }: { status: QuestionStatus }) {
  const t = useTranslations("questionLabels.statuses");
  return <Badge tone={STATUS_TONES[status]}>{t(status)}</Badge>;
}

export function TypeBadge({ type }: { type: QuestionType }) {
  const t = useTranslations("questionLabels.types");
  return <Badge tone="indigo">{t(type)}</Badge>;
}

export function DifficultyBadge({ difficulty }: { difficulty: QuestionDifficulty }) {
  const t = useTranslations("questionLabels.difficulties");
  return <Badge>{t(difficulty)}</Badge>;
}

export function LanguageBadges({ bn, en }: { bn: boolean; en: boolean }) {
  const t = useTranslations("questionLabels.languages");
  return (
    <span className="inline-flex gap-1">
      <Badge tone={bn ? "success" : "neutral"} aria-label={bn ? t("bnComplete") : t("bnIncomplete")}>
        <span aria-hidden="true">{t("bnShort")}</span>
      </Badge>
      <Badge tone={en ? "success" : "neutral"} aria-label={en ? t("enComplete") : t("enIncomplete")}>
        <span aria-hidden="true">{t("enShort")}</span>
      </Badge>
    </span>
  );
}

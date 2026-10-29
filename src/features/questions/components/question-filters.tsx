import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Label, Select } from "@/components/ui/input";
import { LANGUAGE_FILTERS, QUESTION_DIFFICULTIES, QUESTION_STATUSES, QUESTION_TYPES } from "../constants";
import type { QuestionFilters as Filters, Taxonomy } from "../server/queries";

/** GET form: filtering works without client JavaScript and filtered URLs are shareable. */
export async function QuestionFilters({
  taxonomy,
  filters,
  action,
  hideStatus = false,
}: {
  taxonomy: Taxonomy;
  filters: Filters;
  action: string;
  hideStatus?: boolean;
}) {
  const [t, tLabels, locale] = await Promise.all([
    getTranslations("questions.filters"),
    getTranslations("questionLabels"),
    getLocale(),
  ]);
  const name = (row: { name_bn: string; name_en: string }) => (locale === "bn" ? row.name_bn : row.name_en);
  const topics = filters.subject
    ? taxonomy.topics.filter((topic) => topic.subject_id === filters.subject)
    : taxonomy.topics;
  const active = Object.values(filters).some(Boolean);

  const select = (
    id: string,
    label: string,
    value: string | undefined,
    all: string,
    options: { value: string; label: string }[],
  ) => (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Select id={id} name={id.replace("qf-", "")} defaultValue={value ?? ""}>
        <option value="">{all}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
    </div>
  );

  return (
    <form
      method="get"
      action={action}
      className="border-border bg-surface rounded-2xl border p-4 shadow-xs sm:p-5"
    >
      <fieldset>
        <legend className="mb-3 text-sm font-semibold">{t("legend")}</legend>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {select(
            "qf-subject",
            t("subject"),
            filters.subject,
            t("all"),
            taxonomy.subjects.map((s) => ({ value: s.id, label: name(s) })),
          )}
          {select(
            "qf-topic",
            t("topic"),
            filters.topic,
            t("all"),
            topics.map((s) => ({ value: s.id, label: name(s) })),
          )}
          {select(
            "qf-examTarget",
            t("examTarget"),
            filters.examTarget,
            t("all"),
            taxonomy.examTargets.map((s) => ({
              value: s.id,
              label: `${taxonomy.universities.find((u) => u.id === s.university_id)?.short_code ?? ""} · ${name(s)}`,
            })),
          )}
          {select(
            "qf-type",
            t("type"),
            filters.type,
            t("all"),
            QUESTION_TYPES.map((v) => ({ value: v, label: tLabels(`types.${v}`) })),
          )}
          {select(
            "qf-difficulty",
            t("difficulty"),
            filters.difficulty,
            t("all"),
            QUESTION_DIFFICULTIES.map((v) => ({ value: v, label: tLabels(`difficulties.${v}`) })),
          )}
          {hideStatus
            ? null
            : select(
                "qf-status",
                t("status"),
                filters.status,
                t("all"),
                QUESTION_STATUSES.map((v) => ({ value: v, label: tLabels(`statuses.${v}`) })),
              )}
          {select(
            "qf-language",
            t("language"),
            filters.language,
            t("all"),
            LANGUAGE_FILTERS.map((v) => ({ value: v, label: tLabels(`languageFilters.${v}`) })),
          )}
          <div className="flex items-end gap-2">
            <Button type="submit" className="flex-1">
              {t("apply")}
            </Button>
            {active ? (
              <Button asChild variant="secondary" className="flex-1">
                <Link href={action}>{t("clear")}</Link>
              </Button>
            ) : null}
          </div>
        </div>
      </fieldset>
    </form>
  );
}

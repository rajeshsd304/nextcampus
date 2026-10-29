import { Clock3 } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { getFormatContext } from "@/features/preferences/server";
import { formatNumber } from "@/lib/i18n-format";
import { localized, type CatalogSubject, type CatalogTarget } from "../types";

export async function TargetCard({
  target,
  subjects,
  headingLevel = "h3",
}: {
  target: CatalogTarget;
  subjects: CatalogSubject[];
  headingLevel?: "h2" | "h3";
}) {
  const t = await getTranslations("catalog.target");
  const locale = await getLocale();
  const fmt = await getFormatContext();
  const Heading = headingLevel;
  const description = localized(target, "description", locale);
  const format = localized(target, "typical_format", locale);
  const subjectNames = subjects
    .filter((s) => target.subjectIds.includes(s.id))
    .map((s) => localized(s, "name", locale));

  return (
    <article className="border-border bg-surface flex h-full flex-col rounded-2xl border p-5 shadow-xs">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <Heading className="font-semibold">{localized(target, "name", locale)}</Heading>
        <Badge tone="warning" className="shrink-0">
          <Clock3 className="size-3.5" aria-hidden="true" />
          {t("comingSoon")}
        </Badge>
      </div>
      {description ? <p className="text-muted-foreground mt-2 text-sm">{description}</p> : null}
      {subjectNames.length > 0 ? (
        <div className="mt-4">
          <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
            {t("subjects")}
          </p>
          <ul className="mt-2 flex flex-wrap gap-1.5" aria-label={t("subjects")}>
            {subjectNames.map((name) => (
              <li key={name}>
                <Badge tone="indigo">{name}</Badge>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <dl className="border-border mt-4 grid gap-2 border-t pt-4 text-sm">
        {format ? (
          <div>
            <dt className="font-medium">{t("format")}</dt>
            <dd className="text-muted-foreground">{format}</dd>
          </div>
        ) : null}
        <div className="flex flex-wrap justify-between gap-2">
          <dt className="font-medium">{t("negativeMarking")}</dt>
          <dd className="text-muted-foreground">
            {target.negative_marking > 0
              ? t("negativePerWrong", {
                  marks: formatNumber(target.negative_marking, fmt, { maximumFractionDigits: 2 }),
                })
              : t("noNegative")}
          </dd>
        </div>
      </dl>
      <p className="text-muted-foreground mt-auto pt-4 text-xs">{t("verify")}</p>
    </article>
  );
}

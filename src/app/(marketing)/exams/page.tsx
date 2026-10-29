import { SearchX, ServerCrash } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";
import { CatalogFilters } from "@/features/catalog/components/catalog-filters";
import { TargetCard } from "@/features/catalog/components/target-card";
import { filterCatalog, loadPublicCatalog } from "@/features/catalog/server/queries";
import { localized } from "@/features/catalog/types";
import { PageHero, Section } from "@/features/marketing/components/section";
import { getFormatContext } from "@/features/preferences/server";
import { formatNumber } from "@/lib/i18n-format";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("catalog");
  return { title: t("metaTitle"), description: t("metaDescription"), alternates: { canonical: "/exams" } };
}

function param(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" && value.length > 0 && value.length <= 80 ? value : undefined;
}

export default async function ExamCatalogPage({ searchParams }: PageProps<"/exams">) {
  const [t, locale, fmt, result, params] = await Promise.all([
    getTranslations("catalog"),
    getLocale(),
    getFormatContext(),
    loadPublicCatalog(),
    searchParams,
  ]);
  const filters = {
    university: param(params.university),
    category: param(params.category),
    subject: param(params.subject),
  };

  return (
    <>
      <PageHero eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />
      <Section className="py-10 sm:py-14">
        <Alert tone="info" title={t("comingSoonTitle")} className="mb-8">
          {t("comingSoonBody")}
        </Alert>
        {!result.ok ? (
          <EmptyState
            icon={<ServerCrash />}
            title={t("unavailableTitle")}
            description={t("unavailableBody")}
            action={
              <Button asChild variant="secondary">
                <Link href="/exams">{t("retry")}</Link>
              </Button>
            }
          />
        ) : (
          (() => {
            const { catalog } = result;
            const { universities, targets } = filterCatalog(catalog, filters);
            const categoryName = new Map(
              catalog.categories.map((c) => [c.key, localized(c, "name", locale)]),
            );
            return (
              <div className="space-y-10">
                <CatalogFilters catalog={catalog} filters={filters} />
                <p className="text-muted-foreground text-sm" role="status">
                  {t("resultCount", {
                    universities: formatNumber(universities.length, fmt),
                    targets: formatNumber(targets.length, fmt),
                  })}
                </p>
                {universities.length === 0 ? (
                  <EmptyState
                    icon={<SearchX />}
                    title={t("noResultsTitle")}
                    description={t("noResultsBody")}
                    action={
                      <Button asChild variant="secondary">
                        <Link href="/exams">{t("filters.clear")}</Link>
                      </Button>
                    }
                  />
                ) : (
                  universities.map((university) => (
                    <section
                      key={university.id}
                      aria-labelledby={`uni-${university.slug}`}
                      className="space-y-4"
                    >
                      <div className="border-border flex flex-wrap items-end justify-between gap-3 border-b pb-3">
                        <div>
                          <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                            {categoryName.get(university.category_key)}
                          </p>
                          <h2 id={`uni-${university.slug}`} className="font-display text-xl font-semibold">
                            {localized(university, "name", locale)}{" "}
                            <span className="text-muted-foreground text-base font-medium" lang="en">
                              {`(${university.short_code})`}
                            </span>
                          </h2>
                        </div>
                        <Link
                          href={`/exams/${university.slug}`}
                          className="text-primary inline-flex min-h-11 items-center text-sm font-semibold hover:underline dark:text-indigo-300"
                        >
                          {t("viewUniversity")}
                        </Link>
                      </div>
                      <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {targets
                          .filter((target) => target.university_id === university.id)
                          .map((target) => (
                            <li key={target.id}>
                              <TargetCard target={target} subjects={catalog.subjects} />
                            </li>
                          ))}
                      </ul>
                    </section>
                  ))
                )}
              </div>
            );
          })()
        )}
      </Section>
    </>
  );
}

import { ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TargetCard } from "@/features/catalog/components/target-card";
import { loadPublicCatalog } from "@/features/catalog/server/queries";
import { localized } from "@/features/catalog/types";
import { Section } from "@/features/marketing/components/section";

async function findUniversity(slug: string) {
  const result = await loadPublicCatalog();
  if (!result.ok) return { result, university: null };
  return { result, university: result.catalog.universities.find((u) => u.slug === slug) ?? null };
}

export async function generateMetadata({ params }: PageProps<"/exams/[university]">): Promise<Metadata> {
  const { university: slug } = await params;
  const [{ university }, locale, t] = await Promise.all([
    findUniversity(slug),
    getLocale(),
    getTranslations("catalog"),
  ]);
  if (!university) return { title: t("metaTitle") };
  const name = localized(university, "name", locale);
  return {
    title: t("universityMetaTitle", { name }),
    description: t("universityMetaDescription", { name }),
    alternates: { canonical: `/exams/${university.slug}` },
  };
}

export default async function UniversityPage({ params }: PageProps<"/exams/[university]">) {
  const { university: slug } = await params;
  const [{ result, university }, locale, t] = await Promise.all([
    findUniversity(slug),
    getLocale(),
    getTranslations("catalog"),
  ]);
  if (!result.ok) throw new Error("Catalog unavailable");
  // Unknown or deactivated universities are not visible to anon (RLS) → 404.
  if (!university) notFound();

  const { catalog } = result;
  const category = catalog.categories.find((c) => c.key === university.category_key);
  const targets = catalog.targets.filter((target) => target.university_id === university.id);

  return (
    <>
      <div className="bg-hero-glow border-border border-b">
        <div className="container-page py-12 sm:py-16">
          <nav aria-label={t("breadcrumb")} className="text-muted-foreground text-sm">
            <Link href="/exams" className="hover:text-foreground inline-flex min-h-11 items-center">
              {t("backToCatalog")}
            </Link>
          </nav>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            {category ? <Badge tone="indigo">{localized(category, "name", locale)}</Badge> : null}
            <Badge lang="en">{university.short_code}</Badge>
          </div>
          <h1 className="font-display mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            {localized(university, "name", locale)}
          </h1>
          {university.website ? (
            <a
              href={university.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary mt-3 inline-flex min-h-11 items-center gap-1.5 text-sm font-medium hover:underline dark:text-indigo-300"
            >
              {t("officialWebsite")}
              <ExternalLink className="size-3.5" aria-hidden="true" />
              <span className="sr-only">{t("opensInNewTab")}</span>
            </a>
          ) : null}
        </div>
      </div>
      <Section className="py-10 sm:py-14">
        <Alert tone="info" title={t("comingSoonTitle")} className="mb-8">
          {t("comingSoonBody")}
        </Alert>
        <h2 className="font-display mb-4 text-xl font-semibold">{t("targetsHeading")}</h2>
        {targets.length === 0 ? (
          <p className="text-muted-foreground">{t("noTargets")}</p>
        ) : (
          <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {targets.map((target) => (
              <li key={target.id}>
                <TargetCard target={target} subjects={catalog.subjects} />
              </li>
            ))}
          </ul>
        )}
        <div className="mt-10">
          <Button asChild>
            <Link href="/sign-up">{t("signUpCta")}</Link>
          </Button>
        </div>
      </Section>
    </>
  );
}

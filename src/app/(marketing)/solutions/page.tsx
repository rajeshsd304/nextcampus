import { Building2, Presentation, UserRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { CtaBand } from "@/features/marketing/components/cta-band";
import { PageHero, Section } from "@/features/marketing/components/section";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("solutions");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: { canonical: "/solutions" },
  };
}

const SOLUTIONS = [
  ["coaching", <Presentation key="i" />],
  ["institutions", <Building2 key="i" />],
  ["instructors", <UserRound key="i" />],
] as const;

export default async function SolutionsPage() {
  const t = await getTranslations("solutions");
  return (
    <>
      <PageHero eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />
      <Section>
        <div className="grid gap-6 lg:grid-cols-3">
          {SOLUTIONS.map(([key, icon]) => (
            <article key={key} className="border-border bg-surface rounded-2xl border p-7 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="bg-accent text-accent-foreground flex size-11 items-center justify-center rounded-xl [&_svg]:size-5">
                  {icon}
                </div>
                <h2 className="font-display text-xl font-semibold">{t(`items.${key}.title`)}</h2>
              </div>
              <p className="text-muted-foreground mt-4">{t(`items.${key}.lead`)}</p>
              <ul className="mt-5 space-y-2.5 text-sm">
                {(t.raw(`items.${key}.points`) as string[]).map((point) => (
                  <li key={point} className="flex gap-2.5">
                    <span className="bg-primary mt-2 size-1.5 shrink-0 rounded-full" aria-hidden="true" />
                    {point}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Button asChild>
            <Link href="/sign-up">{t("primary")}</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/contact?topic=partnership">{t("secondary")}</Link>
          </Button>
        </div>
      </Section>
      <CtaBand />
    </>
  );
}

import {
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  CheckCircle2,
  ClipboardList,
  Clock3,
  PenLine,
  Target,
  Trophy,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PLANS } from "@/features/billing/plans";
import { UniversityStrip } from "@/features/catalog/components/university-strip";
import { loadPublicCatalog } from "@/features/catalog/server/queries";
import { CtaBand } from "@/features/marketing/components/cta-band";
import { FeatureCard, Section, SectionHeading } from "@/features/marketing/components/section";
import { getFormatContext } from "@/features/preferences/server";
import { formatBdt, formatNumber } from "@/lib/i18n-format";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta");
  return { title: { absolute: t("defaultTitle") }, alternates: { canonical: "/" } };
}

const HOME_FAQ = ["what", "cost", "language", "institutions"] as const;

function SoonBadge({ label }: { label: string }) {
  return (
    <Badge tone="warning">
      <Clock3 className="size-3.5" aria-hidden="true" />
      {label}
    </Badge>
  );
}

export default async function HomePage() {
  const [t, tPlans, fmt, catalogResult] = await Promise.all([
    getTranslations("home"),
    getTranslations("plans"),
    getFormatContext(),
    loadPublicCatalog(),
  ]);
  const universities = catalogResult.ok ? catalogResult.catalog.universities : [];
  const soon = t("comingSoon");

  return (
    <>
      {/* Hero */}
      <section className="bg-hero-glow border-border relative overflow-hidden border-b">
        <div className="container-page grid gap-12 py-16 sm:py-24 lg:grid-cols-[1.15fr_1fr] lg:items-center">
          <div className="animate-fade-up space-y-6">
            <p className="border-border bg-surface/70 text-muted-foreground inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium">
              <Target className="text-primary size-4 dark:text-indigo-300" aria-hidden="true" />
              {t("hero.eyebrow")}
            </p>
            <h1 className="font-display text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
              {t.rich("hero.title", {
                highlight: (chunks) => (
                  <span className="bg-gradient-to-r from-indigo-600 to-sky-500 bg-clip-text text-transparent dark:from-indigo-300 dark:to-sky-300">
                    {chunks}
                  </span>
                ),
              })}
            </h1>
            <p className="text-muted-foreground max-w-xl text-lg">{t("hero.body")}</p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/sign-up">
                  {t("hero.primary")} <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link href="/exams">{t("hero.secondary")}</Link>
              </Button>
            </div>
            <p className="text-muted-foreground text-sm">{t("hero.note")}</p>
          </div>
          <figure className="relative" aria-labelledby="sample-caption">
            <div className="border-border bg-surface/90 rounded-3xl border p-5 shadow-2xl shadow-indigo-950/10 backdrop-blur sm:p-6">
              <div className="border-border flex items-center justify-between gap-3 border-b pb-4">
                <p className="font-semibold">{t("sample.subject")}</p>
                <Badge tone="indigo">{t("sample.badge")}</Badge>
              </div>
              <p className="pt-4 font-medium">{t("sample.question")}</p>
              <ol className="mt-4 grid gap-2 text-sm">
                {(["a", "b", "c", "d"] as const).map((option) => (
                  <li
                    key={option}
                    className={
                      option === "b"
                        ? "flex items-center justify-between rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2.5 dark:border-emerald-800 dark:bg-emerald-950/40"
                        : "border-border rounded-xl border px-3 py-2.5"
                    }
                  >
                    <span>{t(`sample.options.${option}`)}</span>
                    {option === "b" ? (
                      <CheckCircle2 className="text-success size-4" aria-label={t("sample.correct")} />
                    ) : null}
                  </li>
                ))}
              </ol>
              <p className="bg-surface-muted text-muted-foreground mt-4 rounded-xl p-3 text-sm">
                {t("sample.explanation")}
              </p>
            </div>
            <figcaption id="sample-caption" className="text-muted-foreground mt-3 text-center text-xs">
              {t("sample.caption")}
            </figcaption>
          </figure>
        </div>
      </section>

      <UniversityStrip universities={universities} />

      {/* How it works */}
      <Section>
        <SectionHeading
          eyebrow={t("how.eyebrow")}
          title={t("how.title")}
          description={t("how.description")}
        />
        <ol className="mt-12 grid gap-5 md:grid-cols-3">
          {(["choose", "practice", "improve"] as const).map((step, index) => (
            <li key={step} className="border-border bg-surface rounded-2xl border p-6 shadow-xs">
              <span
                className="bg-primary text-primary-foreground flex size-10 items-center justify-center rounded-full font-semibold"
                aria-hidden="true"
              >
                {formatNumber(index + 1, fmt)}
              </span>
              <h3 className="mt-4 font-semibold">{t(`how.steps.${step}.title`)}</h3>
              <p className="text-muted-foreground mt-2 text-sm">{t(`how.steps.${step}.body`)}</p>
            </li>
          ))}
        </ol>
      </Section>

      {/* MCQ + written */}
      <Section className="border-border bg-surface border-y">
        <SectionHeading
          eyebrow={t("formats.eyebrow")}
          title={t("formats.title")}
          description={t("formats.description")}
        />
        <div className="mt-12 grid gap-5 md:grid-cols-2">
          <FeatureCard icon={<BookOpenCheck />} title={t("formats.mcq.title")}>
            {t("formats.mcq.body")}
          </FeatureCard>
          <FeatureCard icon={<PenLine />} title={t("formats.written.title")}>
            {t("formats.written.body")}
          </FeatureCard>
        </div>
      </Section>

      {/* Model tests, analysis, leaderboard */}
      <Section>
        <SectionHeading
          eyebrow={t("roadmap.eyebrow")}
          title={t("roadmap.title")}
          description={t("roadmap.description")}
        />
        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {(
            [
              ["modelTests", <ClipboardList key="i" />],
              ["analytics", <BarChart3 key="i" />],
              ["leaderboard", <Trophy key="i" />],
            ] as const
          ).map(([key, icon]) => (
            <div
              key={key}
              className="border-border bg-surface flex flex-col rounded-2xl border p-6 shadow-xs"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="bg-accent text-accent-foreground flex size-11 items-center justify-center rounded-xl [&_svg]:size-5">
                  {icon}
                </div>
                <SoonBadge label={soon} />
              </div>
              <h3 className="mt-4 font-semibold">{t(`roadmap.${key}.title`)}</h3>
              <p className="text-muted-foreground mt-2 text-sm">{t(`roadmap.${key}.body`)}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Pricing preview */}
      <Section className="border-border bg-surface border-y">
        <SectionHeading
          eyebrow={t("pricing.eyebrow")}
          title={t("pricing.title")}
          description={t("pricing.description")}
        />
        <div className="mx-auto mt-12 grid max-w-4xl gap-5 md:grid-cols-2">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={
                plan.highlighted
                  ? "border-primary bg-background rounded-2xl border p-6 shadow-lg shadow-indigo-900/10"
                  : "border-border bg-background rounded-2xl border p-6"
              }
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-display text-xl font-semibold">{tPlans(`${plan.id}.name`)}</h3>
                {plan.status === "comingSoon" ? <SoonBadge label={soon} /> : null}
              </div>
              <p className="font-display mt-3 text-3xl font-semibold">
                {plan.priceBdt === null ? tPlans("priceTba") : formatBdt(plan.priceBdt, fmt)}
              </p>
              <p className="text-muted-foreground mt-2 text-sm">{tPlans(`${plan.id}.tagline`)}</p>
            </div>
          ))}
        </div>
        <div className="mt-8 text-center">
          <Button asChild variant="secondary">
            <Link href="/pricing">{t("pricing.link")}</Link>
          </Button>
        </div>
      </Section>

      {/* FAQ */}
      <Section>
        <SectionHeading eyebrow={t("faq.eyebrow")} title={t("faq.title")} />
        <div className="divide-border border-border bg-surface mx-auto mt-10 max-w-3xl divide-y rounded-2xl border">
          {HOME_FAQ.map((key) => (
            <details key={key} className="group p-5 sm:p-6">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 rounded-lg font-semibold [&::-webkit-details-marker]:hidden">
                {t(`faq.items.${key}.q`)}
                <span
                  className="text-muted-foreground text-xl leading-none transition-transform group-open:rotate-45"
                  aria-hidden="true"
                >
                  +
                </span>
              </summary>
              <p className="text-muted-foreground mt-3">{t(`faq.items.${key}.a`)}</p>
            </details>
          ))}
        </div>
        <p className="mt-8 text-center">
          <Link
            href="/faq"
            className="text-primary inline-flex min-h-11 items-center font-semibold hover:underline dark:text-indigo-300"
          >
            {t("faq.more")}
          </Link>
        </p>
      </Section>

      {/* Institutions */}
      <Section className="border-border bg-surface border-t">
        <div className="border-border bg-background flex flex-col items-start justify-between gap-6 rounded-3xl border p-6 sm:p-10 md:flex-row md:items-center">
          <div className="max-w-2xl space-y-2">
            <h2 className="font-display text-2xl font-semibold">{t("institutions.title")}</h2>
            <p className="text-muted-foreground">{t("institutions.body")}</p>
          </div>
          <Button asChild variant="secondary" size="lg">
            <Link href="/solutions">{t("institutions.cta")}</Link>
          </Button>
        </div>
      </Section>

      <CtaBand />
    </>
  );
}

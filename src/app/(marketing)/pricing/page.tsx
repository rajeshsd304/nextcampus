import { Check, Clock3 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PLANS } from "@/features/billing/plans";
import { PageHero, Section } from "@/features/marketing/components/section";
import { getFormatContext } from "@/features/preferences/server";
import { formatBdt } from "@/lib/i18n-format";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("pricing");
  return { title: t("metaTitle"), description: t("metaDescription"), alternates: { canonical: "/pricing" } };
}

export default async function PricingPage() {
  const [t, tPlans, fmt] = await Promise.all([
    getTranslations("pricing"),
    getTranslations("plans"),
    getFormatContext(),
  ]);
  return (
    <>
      <PageHero eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />
      <Section>
        <Alert tone="info" title={t("noticeTitle")} className="mx-auto mb-10 max-w-4xl">
          {t("noticeBody")}
        </Alert>
        <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
          {PLANS.map((plan) => (
            <article
              key={plan.id}
              aria-labelledby={`plan-${plan.id}`}
              className={cn(
                "bg-surface relative flex flex-col rounded-3xl border p-7 shadow-xs",
                plan.highlighted ? "border-primary shadow-xl shadow-indigo-900/10" : "border-border",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <h2 id={`plan-${plan.id}`} className="font-display text-xl font-semibold">
                  {tPlans(`${plan.id}.name`)}
                </h2>
                {plan.status === "comingSoon" ? (
                  <Badge tone="warning">
                    <Clock3 className="size-3.5" aria-hidden="true" />
                    {t("comingSoon")}
                  </Badge>
                ) : (
                  <Badge tone="success">{t("availableNow")}</Badge>
                )}
              </div>
              <p className="text-muted-foreground mt-2 text-sm">{tPlans(`${plan.id}.tagline`)}</p>
              <p className="mt-6">
                {plan.priceBdt === null ? (
                  <span className="font-display text-3xl font-semibold">{tPlans("priceTba")}</span>
                ) : (
                  <>
                    <span className="font-display text-4xl font-semibold">
                      {formatBdt(plan.priceBdt, fmt)}
                    </span>
                    <span className="text-muted-foreground">{` ${tPlans("perMonth")}`}</span>
                  </>
                )}
              </p>
              <ul className="mt-6 flex-1 space-y-3 text-sm">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-2.5">
                    <Check
                      className="text-primary mt-1 size-4 shrink-0 dark:text-indigo-300"
                      aria-hidden="true"
                    />
                    {tPlans(`features.${feature}`)}
                  </li>
                ))}
              </ul>
              {plan.status === "available" ? (
                <Button asChild className="mt-8">
                  <Link href="/sign-up">{tPlans(`${plan.id}.cta`)}</Link>
                </Button>
              ) : (
                <Button className="mt-8" variant="secondary" disabled aria-disabled="true">
                  {tPlans(`${plan.id}.cta`)}
                </Button>
              )}
            </article>
          ))}
        </div>
        <div className="text-muted-foreground mx-auto mt-10 max-w-4xl space-y-2 text-center text-sm">
          <p>{t("paymentNote")}</p>
          <p>
            {t("institutionsNote")}{" "}
            <Link
              href="/contact?topic=sales"
              className="text-primary font-semibold hover:underline dark:text-indigo-300"
            >
              {t("contactUs")}
            </Link>
          </p>
        </div>
      </Section>
    </>
  );
}

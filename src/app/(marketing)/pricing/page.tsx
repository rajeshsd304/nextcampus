import { Check } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PLANS } from "@/features/billing/plans";
import { PageHero, Section } from "@/features/marketing/components/section";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Simple plans for independent instructors, institutions and enterprises.",
  alternates: { canonical: "/pricing" },
};

export default function PricingPage() {
  return (
    <>
      <PageHero
        eyebrow="Pricing"
        title="Plans that grow with your institution"
        description="Start free. Upgrade when you need more candidates, oversight or support."
      />
      <Section>
        <div className="grid gap-6 lg:grid-cols-3">
          {PLANS.map((plan) => (
            <article
              key={plan.id}
              aria-labelledby={`plan-${plan.id}`}
              className={cn(
                "bg-surface relative flex flex-col rounded-3xl border p-7 shadow-xs",
                plan.highlighted ? "border-primary shadow-xl shadow-indigo-900/10" : "border-border",
              )}
            >
              {plan.highlighted ? (
                <p className="bg-primary text-primary-foreground absolute -top-3 left-7 rounded-full px-3 py-1 text-xs font-semibold">
                  Most popular
                </p>
              ) : null}
              <h2 id={`plan-${plan.id}`} className="font-display text-xl font-semibold">
                {plan.name}
              </h2>
              <p className="text-muted-foreground mt-2 text-sm">{plan.tagline}</p>
              <p className="mt-6">
                {plan.priceMonthly === null ? (
                  <span className="font-display text-4xl font-semibold">Custom</span>
                ) : (
                  <>
                    <span className="font-display text-4xl font-semibold">${plan.priceMonthly}</span>
                    <span className="text-muted-foreground"> / month</span>
                  </>
                )}
              </p>
              <p className="text-muted-foreground mt-1 text-sm">{plan.audience}</p>
              <ul className="mt-6 flex-1 space-y-3 text-sm">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-2.5">
                    <Check
                      className="text-primary mt-0.5 size-4 shrink-0 dark:text-indigo-300"
                      aria-hidden="true"
                    />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button asChild className="mt-8" variant={plan.highlighted ? "primary" : "secondary"}>
                <Link href={plan.cta.href}>{plan.cta.label}</Link>
              </Button>
            </article>
          ))}
        </div>
        <p className="text-muted-foreground mt-10 text-center text-sm">
          Prices in USD, excluding applicable taxes. Paid plans are arranged with our team while self-serve
          billing is being rolled out.
        </p>
      </Section>
    </>
  );
}

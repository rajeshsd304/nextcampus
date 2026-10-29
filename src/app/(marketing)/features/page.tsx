import {
  BookOpenCheck,
  Clock3,
  Globe2,
  KeyRound,
  Languages,
  Layers,
  MonitorSmartphone,
  Moon,
  PenLine,
  ShieldCheck,
} from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { CtaBand } from "@/features/marketing/components/cta-band";
import { PageHero, Section, SectionHeading } from "@/features/marketing/components/section";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("features");
  return { title: t("metaTitle"), description: t("metaDescription"), alternates: { canonical: "/features" } };
}

const GROUPS = [
  {
    key: "available",
    items: [
      ["catalog", <Globe2 key="i" />],
      ["bilingual", <Languages key="i" />],
      ["accounts", <KeyRound key="i" />],
      ["privacy", <ShieldCheck key="i" />],
      ["devices", <MonitorSmartphone key="i" />],
      ["themes", <Moon key="i" />],
    ],
  },
  {
    key: "upcoming",
    items: [
      ["mcq", <BookOpenCheck key="i" />],
      ["written", <PenLine key="i" />],
      ["institutions", <Layers key="i" />],
    ],
  },
] as const;

export default async function FeaturesPage() {
  const t = await getTranslations("features");
  return (
    <>
      <PageHero eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />
      {GROUPS.map((group, index) => (
        <Section
          key={group.key}
          className={index % 2 === 1 ? "border-border bg-surface border-y" : undefined}
        >
          <SectionHeading
            title={t(`groups.${group.key}.title`)}
            description={t(`groups.${group.key}.description`)}
            align="left"
          />
          <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {group.items.map(([key, icon]) => (
              <li key={key} className="border-border bg-surface rounded-2xl border p-6 shadow-xs">
                <div className="flex items-start justify-between gap-3">
                  <div className="bg-accent text-accent-foreground flex size-11 items-center justify-center rounded-xl [&_svg]:size-5">
                    {icon}
                  </div>
                  {group.key === "upcoming" ? (
                    <Badge tone="warning">
                      <Clock3 className="size-3.5" aria-hidden="true" />
                      {t("comingSoon")}
                    </Badge>
                  ) : (
                    <Badge tone="success">{t("availableNow")}</Badge>
                  )}
                </div>
                <h3 className="mt-4 font-semibold">{t(`items.${key}.title`)}</h3>
                <p className="text-muted-foreground mt-2 text-sm">{t(`items.${key}.body`)}</p>
              </li>
            ))}
          </ul>
        </Section>
      ))}
      <CtaBand />
    </>
  );
}

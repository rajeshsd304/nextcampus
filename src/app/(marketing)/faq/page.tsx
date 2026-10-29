import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { CtaBand } from "@/features/marketing/components/cta-band";
import { PageHero, Section } from "@/features/marketing/components/section";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("faq");
  return { title: t("metaTitle"), description: t("metaDescription"), alternates: { canonical: "/faq" } };
}

export default async function FaqPage() {
  const t = await getTranslations("faq");
  const groups = t.raw("groups") as { title: string; items: { q: string; a: string }[] }[];
  return (
    <>
      <PageHero eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />
      <Section>
        <div className="mx-auto max-w-3xl space-y-10">
          {groups.map((group) => (
            <section key={group.title} aria-labelledby={`faq-${group.title}`}>
              <h2 id={`faq-${group.title}`} className="font-display mb-4 text-xl font-semibold">
                {group.title}
              </h2>
              <div className="divide-border border-border bg-surface divide-y rounded-2xl border">
                {group.items.map((item) => (
                  <details key={item.q} className="group p-5 sm:p-6">
                    <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 rounded-lg font-semibold [&::-webkit-details-marker]:hidden">
                      {item.q}
                      <span
                        className="text-muted-foreground text-xl leading-none transition-transform group-open:rotate-45"
                        aria-hidden="true"
                      >
                        +
                      </span>
                    </summary>
                    <p className="text-muted-foreground mt-3">{item.a}</p>
                  </details>
                ))}
              </div>
            </section>
          ))}
        </div>
        <p className="text-muted-foreground mt-10 text-center">
          {t("stillQuestions")}{" "}
          <Link href="/contact" className="text-primary font-semibold hover:underline dark:text-indigo-300">
            {t("contactUs")}
          </Link>
        </p>
      </Section>
      <CtaBand />
    </>
  );
}

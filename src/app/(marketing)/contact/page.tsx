import { Clock, Mail, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ContactForm } from "@/features/contact/components/contact-form";
import { CONTACT_TOPICS } from "@/features/contact/schemas";
import { PageHero, Section } from "@/features/marketing/components/section";
import { siteConfig } from "@/lib/site";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("contact");
  return { title: t("metaTitle"), description: t("metaDescription"), alternates: { canonical: "/contact" } };
}

export default async function ContactPage({ searchParams }: PageProps<"/contact">) {
  const t = await getTranslations("contact");
  const params = await searchParams;
  const requested = typeof params.topic === "string" ? params.topic : "";
  const topic = CONTACT_TOPICS.find((value) => value === requested) ?? "support";

  const info = [
    {
      icon: <Mail />,
      title: t("emailTitle"),
      body: (
        <a href={`mailto:${siteConfig.contactEmail}`} className="hover:underline">
          {siteConfig.contactEmail}
        </a>
      ),
    },
    { icon: <Clock />, title: t("responseTitle"), body: t("responseBody") },
    { icon: <ShieldCheck />, title: t("securityTitle"), body: t("securityBody") },
  ];

  return (
    <>
      <PageHero eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />
      <Section>
        <div className="grid gap-10 lg:grid-cols-[1fr_1.6fr]">
          <aside className="space-y-6">
            {info.map((item) => (
              <div key={item.title} className="flex gap-4">
                <div className="bg-accent text-accent-foreground flex size-10 shrink-0 items-center justify-center rounded-xl [&_svg]:size-5">
                  {item.icon}
                </div>
                <div>
                  <h2 className="font-semibold">{item.title}</h2>
                  <p className="text-muted-foreground text-sm">{item.body}</p>
                </div>
              </div>
            ))}
          </aside>
          <div className="border-border bg-surface rounded-2xl border p-5 shadow-xs sm:p-8">
            <ContactForm defaultTopic={topic} />
          </div>
        </div>
      </Section>
    </>
  );
}

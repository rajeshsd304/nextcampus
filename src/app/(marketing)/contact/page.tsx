import { Clock, Mail, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { ContactForm } from "@/features/contact/components/contact-form";
import { CONTACT_TOPICS } from "@/features/contact/schemas";
import { PageHero, Section } from "@/features/marketing/components/section";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description: "Talk to the NextCampus team about pricing, onboarding, support or security.",
  alternates: { canonical: "/contact" },
};

export default async function ContactPage({ searchParams }: PageProps<"/contact">) {
  const params = await searchParams;
  const requested = typeof params.topic === "string" ? params.topic : "";
  const topic = CONTACT_TOPICS.find((t) => t === requested) ?? "sales";

  return (
    <>
      <PageHero
        eyebrow="Contact"
        title="Let's talk"
        description="Tell us about your institution and we'll help you get set up."
      />
      <Section>
        <div className="grid gap-10 lg:grid-cols-[1fr_1.6fr]">
          <aside className="space-y-6">
            {[
              {
                icon: <Mail />,
                title: "Email",
                body: (
                  <a href={`mailto:${siteConfig.contactEmail}`} className="hover:underline">
                    {siteConfig.contactEmail}
                  </a>
                ),
              },
              { icon: <Clock />, title: "Response time", body: "Usually within one business day." },
              {
                icon: <ShieldCheck />,
                title: "Security reports",
                body: "Choose “Security or privacy” and we'll route it to our security team.",
              },
            ].map((item) => (
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
          <div className="border-border bg-surface rounded-2xl border p-6 shadow-xs sm:p-8">
            <ContactForm defaultTopic={topic} />
          </div>
        </div>
      </Section>
    </>
  );
}

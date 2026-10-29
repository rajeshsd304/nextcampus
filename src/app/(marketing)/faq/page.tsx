import type { Metadata } from "next";
import Link from "next/link";
import { CtaBand } from "@/features/marketing/components/cta-band";
import { PageHero, Section } from "@/features/marketing/components/section";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Answers to common questions about NextCampus accounts, organizations, invitations and security.",
  alternates: { canonical: "/faq" },
};

const faqs = [
  {
    q: "Who is NextCampus for?",
    a: "Universities, coaching centers, training organizations and independent instructors who need a secure, accountable way to run digital assessments.",
  },
  {
    q: "How do students join my organization?",
    a: "Administrators send email invitations from the Invitations page. Each invitation works only for the address it was sent to, can be used once, and expires after seven days.",
  },
  {
    q: "Can one person belong to several organizations?",
    a: "Yes. A person can belong to multiple organizations with a different role in each, and switch between workspaces from the header.",
  },
  {
    q: "How is my institution's data kept separate from others?",
    a: "Isolation is enforced in two places: the application checks permissions on the server for every request, and PostgreSQL row-level security policies independently restrict every query to the organizations you belong to.",
  },
  {
    q: "Which sign-in methods are supported?",
    a: "You can continue with Google, or sign up with an email address and password. Email accounts are verified, and passwords can be reset securely by email.",
  },
  {
    q: "What does the audit log record?",
    a: "Organization creation and updates, invitations sent, accepted, declined or revoked, role changes, removals, and account security events such as sign-ins and password changes — all timestamped by the database.",
  },
  {
    q: "What happens if an organization is suspended?",
    a: "Members keep their accounts, but all organization permissions are paused until the organization is reactivated.",
  },
];

export default function FaqPage() {
  return (
    <>
      <PageHero
        eyebrow="FAQ"
        title="Frequently asked questions"
        description="Can't find what you're looking for? Our team is happy to help."
      />
      <Section>
        <div className="divide-border border-border bg-surface mx-auto max-w-3xl divide-y rounded-2xl border">
          {faqs.map((item) => (
            <details key={item.q} className="group p-5 sm:p-6">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-lg font-semibold [&::-webkit-details-marker]:hidden">
                {item.q}
                <span
                  className="text-muted-foreground text-xl leading-none transition-transform group-open:rotate-45"
                  aria-hidden="true"
                >
                  +
                </span>
              </summary>
              <p className="text-muted-foreground mt-3 leading-relaxed">{item.a}</p>
            </details>
          ))}
        </div>
        <p className="text-muted-foreground mt-10 text-center">
          Still have questions?{" "}
          <Link href="/contact" className="text-primary font-semibold hover:underline dark:text-indigo-300">
            Contact us
          </Link>
        </p>
      </Section>
      <CtaBand />
    </>
  );
}

import { Building2, GraduationCap, Presentation, UserRound } from "lucide-react";
import type { Metadata } from "next";
import { CtaBand } from "@/features/marketing/components/cta-band";
import { PageHero, Section } from "@/features/marketing/components/section";

export const metadata: Metadata = {
  title: "Solutions for institutions",
  description:
    "How universities, coaching centers, training organizations and independent instructors use NextCampus.",
  alternates: { canonical: "/solutions" },
};

const solutions = [
  {
    icon: <GraduationCap />,
    title: "Universities",
    lead: "Department-level control with institution-wide accountability.",
    points: [
      "Separate administrator, instructor and invigilator roles",
      "Audit trail for every role and membership change",
      "Invite faculty and students in bulk, by email",
    ],
  },
  {
    icon: <Presentation />,
    title: "Coaching centers",
    lead: "Run frequent mock tests without losing track of who has access.",
    points: [
      "Self-serve onboarding in minutes",
      "Expiring, single-use invitations for each batch",
      "Students see only their own workspace",
    ],
  },
  {
    icon: <Building2 />,
    title: "Training organizations",
    lead: "Certification-grade oversight for professional programs.",
    points: [
      "Dedicated reviewer role for integrity decisions",
      "Server-side timestamps on every sensitive action",
      "Tenant isolation enforced in the database",
    ],
  },
  {
    icon: <UserRound />,
    title: "Independent instructors",
    lead: "A professional exam platform without the IT department.",
    points: [
      "Create your own organization for free",
      "Sign in with Google in one click",
      "Grow into a team by inviting co-instructors",
    ],
  },
];

export default function SolutionsPage() {
  return (
    <>
      <PageHero
        eyebrow="Solutions"
        title="Built for the way your institution assesses"
        description="From a single tutor to a multi-campus university, NextCampus adapts to your structure without compromising on security."
      />
      <Section>
        <div className="grid gap-6 lg:grid-cols-2">
          {solutions.map((solution) => (
            <article
              key={solution.title}
              className="border-border bg-surface rounded-2xl border p-7 shadow-xs"
            >
              <div className="flex items-center gap-3">
                <div className="bg-accent text-accent-foreground flex size-11 items-center justify-center rounded-xl [&_svg]:size-5">
                  {solution.icon}
                </div>
                <h2 className="font-display text-xl font-semibold">{solution.title}</h2>
              </div>
              <p className="text-muted-foreground mt-4">{solution.lead}</p>
              <ul className="mt-5 space-y-2.5 text-sm">
                {solution.points.map((point) => (
                  <li key={point} className="flex gap-2.5">
                    <span className="bg-primary mt-1.5 size-1.5 shrink-0 rounded-full" aria-hidden="true" />
                    {point}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </Section>
      <CtaBand />
    </>
  );
}

import {
  ArrowRight,
  Building2,
  ClipboardCheck,
  Fingerprint,
  GraduationCap,
  History,
  KeyRound,
  Layers,
  PenSquare,
  ShieldCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CtaBand } from "@/features/marketing/components/cta-band";
import { FeatureCard, Section, SectionHeading } from "@/features/marketing/components/section";

const roles = [
  {
    icon: <GraduationCap />,
    title: "Students",
    text: "A calm, focused space to see upcoming assessments, results and announcements.",
  },
  {
    icon: <PenSquare />,
    title: "Instructors",
    text: "Rosters, cohorts and assessment tools organized around how you teach.",
  },
  {
    icon: <ClipboardCheck />,
    title: "Invigilators & reviewers",
    text: "A dedicated review desk for live monitoring and integrity decisions.",
  },
  {
    icon: <Building2 />,
    title: "Administrators",
    text: "Invite people, assign roles and see every administrative change on the record.",
  },
];

export default function HomePage() {
  return (
    <>
      <section className="bg-hero-glow border-border relative overflow-hidden border-b">
        <div className="container-page grid gap-12 py-20 sm:py-28 lg:grid-cols-[1.1fr_1fr] lg:items-center">
          <div className="animate-fade-up space-y-7">
            <p className="border-border bg-surface/70 text-muted-foreground inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium">
              <ShieldCheck className="text-primary size-4 dark:text-indigo-300" aria-hidden="true" />
              Built for academic integrity
            </p>
            <h1 className="font-display text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
              Secure, trusted,{" "}
              <span className="bg-gradient-to-r from-indigo-600 to-sky-500 bg-clip-text text-transparent dark:from-indigo-300 dark:to-sky-300">
                modern
              </span>{" "}
              digital assessments.
            </h1>
            <p className="text-muted-foreground max-w-xl text-lg">
              NextCampus gives universities, coaching centers, training organizations and independent
              instructors one platform to run examinations — with role-based access, tenant isolation and a
              complete audit trail.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/sign-up">
                  Get started free <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link href="/solutions">Solutions for institutions</Link>
              </Button>
            </div>
          </div>
          <div className="relative" aria-hidden="true">
            <div className="border-border bg-surface/80 rounded-3xl border p-5 shadow-2xl shadow-indigo-950/10 backdrop-blur">
              <div className="border-border flex items-center justify-between border-b pb-4">
                <div>
                  <p className="text-muted-foreground text-xs">Northbridge University</p>
                  <p className="font-semibold">Organization overview</p>
                </div>
                <span className="bg-accent text-accent-foreground rounded-full px-2.5 py-1 text-xs font-semibold">
                  Admin
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3 py-4">
                {[
                  ["Students", "1,284"],
                  ["Instructors", "42"],
                  ["Reviewers", "9"],
                ].map(([label, value]) => (
                  <div key={label} className="bg-surface-muted rounded-xl p-3">
                    <p className="text-muted-foreground text-xs">{label}</p>
                    <p className="font-display text-xl font-semibold">{value}</p>
                  </div>
                ))}
              </div>
              <ul className="space-y-2.5 text-sm">
                {[
                  "Invitation accepted — instructor",
                  "Member role changed — student → reviewer",
                  "Organization updated — website",
                ].map((line) => (
                  <li
                    key={line}
                    className="border-border flex items-center gap-2 rounded-lg border px-3 py-2"
                  >
                    <History className="text-primary size-4 dark:text-indigo-300" />
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <Section>
        <SectionHeading
          eyebrow="Platform"
          title="Integrity is the foundation, not an add-on"
          description="Every request is authorized on the server and again in the database, so one institution's data is never visible to another."
        />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <FeatureCard icon={<Layers />} title="True multi-tenancy">
            Each organization is isolated with row-level security policies enforced by PostgreSQL itself.
          </FeatureCard>
          <FeatureCard icon={<Users />} title="Role-aware workspaces">
            Students, instructors, invigilators and administrators each get a dashboard designed for their
            job.
          </FeatureCard>
          <FeatureCard icon={<History />} title="Append-only audit trail">
            Invitations, role changes and organization updates are recorded with server-side timestamps.
          </FeatureCard>
          <FeatureCard icon={<KeyRound />} title="Flexible sign-in">
            Continue with Google or use email and password with verification and secure password recovery.
          </FeatureCard>
          <FeatureCard icon={<Fingerprint />} title="Email-bound invitations">
            Single-use, expiring invitations that only work for the address they were sent to.
          </FeatureCard>
          <FeatureCard icon={<ShieldCheck />} title="Private by default">
            Least-privilege access everywhere: no data is exposed unless a policy explicitly allows it.
          </FeatureCard>
        </div>
      </Section>

      <Section className="border-border bg-surface border-y">
        <SectionHeading eyebrow="For everyone involved" title="One platform, four perspectives" />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {roles.map((role) => (
            <FeatureCard key={role.title} icon={role.icon} title={role.title}>
              {role.text}
            </FeatureCard>
          ))}
        </div>
      </Section>

      <CtaBand />
    </>
  );
}

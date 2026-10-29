import {
  Bell,
  Building2,
  History,
  KeyRound,
  Layers,
  Mail,
  MonitorSmartphone,
  Moon,
  ShieldCheck,
  Users,
} from "lucide-react";
import type { Metadata } from "next";
import { CtaBand } from "@/features/marketing/components/cta-band";
import { FeatureCard, PageHero, Section, SectionHeading } from "@/features/marketing/components/section";

export const metadata: Metadata = {
  title: "Features",
  description:
    "Multi-tenant organizations, role-based dashboards, secure invitations, audit logs and flexible sign-in.",
  alternates: { canonical: "/features" },
};

const groups = [
  {
    title: "Identity and access",
    items: [
      {
        icon: <KeyRound />,
        title: "Google and email sign-in",
        text: "Continue with Google, or use email and password with verification and recovery.",
      },
      {
        icon: <Users />,
        title: "Five distinct roles",
        text: "Student, Instructor, Organization Admin, Invigilator/Reviewer and platform Super Admin.",
      },
      {
        icon: <ShieldCheck />,
        title: "Server-enforced authorization",
        text: "Every page and mutation checks permissions on the server and again in the database.",
      },
    ],
  },
  {
    title: "Organizations",
    items: [
      {
        icon: <Building2 />,
        title: "Self-serve onboarding",
        text: "Create an organization with its own workspace address in under a minute.",
      },
      {
        icon: <Mail />,
        title: "Secure invitations",
        text: "Email-bound, single-use links that expire after seven days and can be revoked anytime.",
      },
      {
        icon: <Layers />,
        title: "Tenant isolation",
        text: "Row-level security keeps each institution's members, invitations and logs private.",
      },
    ],
  },
  {
    title: "Oversight",
    items: [
      {
        icon: <History />,
        title: "Audit log",
        text: "An append-only history of tenancy changes and sign-in events with database timestamps.",
      },
      {
        icon: <Bell />,
        title: "Notification center",
        text: "In-app alerts for invitations, role changes and security events.",
      },
      {
        icon: <MonitorSmartphone />,
        title: "Works everywhere",
        text: "Responsive, keyboard-accessible layouts for phones, tablets and desktops.",
      },
      {
        icon: <Moon />,
        title: "Light and dark themes",
        text: "Comfortable for long sessions, following your system preference by default.",
      },
    ],
  },
];

export default function FeaturesPage() {
  return (
    <>
      <PageHero
        eyebrow="Features"
        title="Everything an institution needs to run assessments with confidence"
        description="NextCampus starts with the parts that matter most for trust: identity, access and accountability."
      />
      {groups.map((group, index) => (
        <Section
          key={group.title}
          className={index % 2 === 1 ? "border-border bg-surface border-y" : undefined}
        >
          <SectionHeading title={group.title} align="left" />
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {group.items.map((item) => (
              <FeatureCard key={item.title} icon={item.icon} title={item.title}>
                {item.text}
              </FeatureCard>
            ))}
          </div>
        </Section>
      ))}
      <CtaBand />
    </>
  );
}

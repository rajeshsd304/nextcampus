import { BookOpenCheck, Briefcase, Calculator, FlaskConical, Languages, Stethoscope } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { CtaBand } from "@/features/marketing/components/cta-band";
import { PageHero, Section } from "@/features/marketing/components/section";

export const metadata: Metadata = {
  title: "Exam catalog",
  description:
    "The kinds of assessments institutions run on NextCampus, from university finals to professional certification.",
  alternates: { canonical: "/exams" },
};

const categories = [
  {
    icon: <BookOpenCheck />,
    title: "University examinations",
    formats: ["Midterms and finals", "Continuous assessment", "Make-up exams"],
    audience: "Universities and colleges",
  },
  {
    icon: <Calculator />,
    title: "Admission and entrance tests",
    formats: ["Timed mock tests", "Section-wise practice", "Rank lists"],
    audience: "Coaching centers",
  },
  {
    icon: <Briefcase />,
    title: "Professional certification",
    formats: ["Proctored certification", "Recertification", "Skills checks"],
    audience: "Training organizations",
  },
  {
    icon: <Languages />,
    title: "Language proficiency",
    formats: ["Reading and listening", "Written responses", "Placement tests"],
    audience: "Language schools",
  },
  {
    icon: <FlaskConical />,
    title: "Science and lab theory",
    formats: ["Concept checks", "Lab safety quizzes", "Practical theory"],
    audience: "Departments and labs",
  },
  {
    icon: <Stethoscope />,
    title: "Clinical and compliance",
    formats: ["Mandatory training", "Annual compliance", "Case-based questions"],
    audience: "Healthcare and enterprise",
  },
];

export default function ExamCatalogPage() {
  return (
    <>
      <PageHero
        eyebrow="Exam catalog"
        title="Assessments for every kind of learning"
        description="Exams on NextCampus are published privately by each institution to its own members. Here are the formats institutions run on the platform."
      />
      <Section>
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <li
              key={category.title}
              className="border-border bg-surface flex flex-col rounded-2xl border p-6 shadow-xs"
            >
              <div className="bg-accent text-accent-foreground mb-4 flex size-11 items-center justify-center rounded-xl [&_svg]:size-5">
                {category.icon}
              </div>
              <h2 className="font-semibold">{category.title}</h2>
              <p className="text-muted-foreground mt-1 text-sm">{category.audience}</p>
              <ul className="mt-4 space-y-1.5 text-sm">
                {category.formats.map((format) => (
                  <li key={format} className="flex items-center gap-2">
                    <span className="bg-primary size-1.5 rounded-full" aria-hidden="true" />
                    {format}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
        <p className="text-muted-foreground mt-10 text-center text-sm">
          Looking for a specific exam? Sign in to see the assessments your institution has published for you,
          or{" "}
          <Link href="/contact" className="text-primary font-medium hover:underline dark:text-indigo-300">
            contact us
          </Link>
          .
        </p>
      </Section>
      <CtaBand />
    </>
  );
}

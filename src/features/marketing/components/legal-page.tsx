import type { ReactNode } from "react";

export type LegalSection = { heading: string; body: ReactNode };

export function LegalPage({
  title,
  updated,
  intro,
  sections,
}: {
  title: string;
  updated: string;
  intro: ReactNode;
  sections: LegalSection[];
}) {
  return (
    <article className="container-page max-w-3xl py-16 sm:py-20">
      <header className="border-border border-b pb-8">
        <p className="text-primary text-sm font-semibold dark:text-indigo-300">Legal</p>
        <h1 className="font-display mt-2 text-4xl font-semibold tracking-tight">{title}</h1>
        <p className="text-muted-foreground mt-3 text-sm">
          Last updated{" "}
          <time dateTime={updated}>
            {new Date(updated).toLocaleDateString("en", { dateStyle: "long", timeZone: "UTC" })}
          </time>
        </p>
        <div className="text-muted-foreground mt-6 text-lg">{intro}</div>
      </header>
      <div className="space-y-10 pt-10">
        {sections.map((section, index) => (
          <section key={section.heading} aria-labelledby={`legal-${index}`}>
            <h2 id={`legal-${index}`} className="font-display text-xl font-semibold">
              {index + 1}. {section.heading}
            </h2>
            <div className="text-muted-foreground mt-3 space-y-3 leading-relaxed [&_li]:ml-5 [&_li]:list-disc [&_li]:pl-1">
              {section.body}
            </div>
          </section>
        ))}
      </div>
    </article>
  );
}

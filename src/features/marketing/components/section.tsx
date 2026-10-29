import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Section({
  id,
  className,
  children,
}: {
  id?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className={cn("py-16 sm:py-24", className)}>
      <div className="container-page">{children}</div>
    </section>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
  as: Heading = "h2",
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  align?: "center" | "left";
  as?: "h1" | "h2";
}) {
  return (
    <div className={cn("max-w-2xl space-y-3", align === "center" && "mx-auto text-center")}>
      {eyebrow ? (
        <p className="text-primary text-sm font-semibold tracking-wide uppercase dark:text-indigo-300">
          {eyebrow}
        </p>
      ) : null}
      <Heading
        className={cn(
          "font-display font-semibold tracking-tight text-balance",
          Heading === "h1" ? "text-4xl sm:text-5xl" : "text-3xl sm:text-4xl",
        )}
      >
        {title}
      </Heading>
      {description ? <p className="text-muted-foreground text-lg">{description}</p> : null}
    </div>
  );
}

export function PageHero({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: ReactNode;
}) {
  return (
    <div className="bg-hero-glow border-border border-b">
      <div className="container-page py-16 sm:py-24">
        <SectionHeading as="h1" eyebrow={eyebrow} title={title} description={description} />
      </div>
    </div>
  );
}

export function FeatureCard({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="border-border bg-surface rounded-2xl border p-6 shadow-xs transition-shadow hover:shadow-md">
      <div className="bg-accent text-accent-foreground mb-4 flex size-11 items-center justify-center rounded-xl [&_svg]:size-5">
        {icon}
      </div>
      <h3 className="font-semibold">{title}</h3>
      <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{children}</p>
    </div>
  );
}

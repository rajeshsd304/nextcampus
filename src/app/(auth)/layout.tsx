import { CheckCircle2 } from "lucide-react";
import type { ReactNode } from "react";
import { Logo } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";

const points = [
  "Role-based workspaces for students, instructors and administrators",
  "Tenant isolation enforced in the database, not just the UI",
  "A tamper-evident audit trail for every administrative change",
];

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1.05fr]">
      <aside className="bg-navy-950 relative hidden overflow-hidden p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="bg-hero-glow absolute inset-0 opacity-90" aria-hidden="true" />
        <div className="relative">
          <Logo className="text-white [&_span_span]:text-indigo-300" />
        </div>
        <div className="relative max-w-md space-y-6">
          <h2 className="font-display text-3xl font-semibold tracking-tight text-balance">
            Assessments your institution can trust.
          </h2>
          <ul className="space-y-3">
            {points.map((point) => (
              <li key={point} className="flex gap-3 text-indigo-100">
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-indigo-300" aria-hidden="true" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-sm text-indigo-200/80">© {new Date().getFullYear()} NextCampus</p>
      </aside>
      <div className="flex flex-col">
        <header className="flex items-center justify-between p-4 sm:p-6">
          <Logo className="lg:invisible" />
          <ThemeToggle />
        </header>
        <main id="main" className="flex flex-1 items-center justify-center px-4 pb-16 sm:px-6">
          <div className="animate-fade-up w-full max-w-md">{children}</div>
        </main>
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Logo } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="bg-hero-glow min-h-dvh">
      <header className="mx-auto flex max-w-5xl items-center justify-between p-4 sm:p-6">
        <Logo href="/dashboard" />
        <ThemeToggle />
      </header>
      <main id="main" className="mx-auto max-w-xl px-4 pb-20 sm:px-6">
        {children}
      </main>
    </div>
  );
}

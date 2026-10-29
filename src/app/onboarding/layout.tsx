import type { Metadata } from "next";
import type { ReactNode } from "react";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { Logo } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="bg-hero-glow min-h-dvh">
      <header className="mx-auto flex max-w-5xl items-center justify-between gap-2 p-4 sm:p-6">
        <Logo href="/dashboard" />
        <div className="flex items-center gap-1">
          <LocaleSwitcher compact />
          <ThemeToggle />
        </div>
      </header>
      <main id="main" className="mx-auto max-w-xl px-4 pb-20 sm:px-6">
        {children}
      </main>
    </div>
  );
}

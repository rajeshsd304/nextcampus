import { CheckCircle2 } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { Logo } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { getFormatContext } from "@/features/preferences/server";
import { formatNumber } from "@/lib/i18n-format";
import { BRAND } from "@/lib/site";

export default async function AuthLayout({ children }: { children: ReactNode }) {
  const t = await getTranslations("authPages.aside");
  const fmt = await getFormatContext();
  const points = [t("point1"), t("point2"), t("point3")];

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1.05fr]">
      <aside className="bg-navy-950 relative hidden overflow-hidden p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="bg-hero-glow absolute inset-0 opacity-90" aria-hidden="true" />
        <div className="relative">
          <Logo className="text-white [&_span_span]:text-indigo-300" />
        </div>
        <div className="relative max-w-md space-y-6">
          <h2 className="font-display text-3xl font-semibold tracking-tight text-balance">{t("title")}</h2>
          <ul className="space-y-3">
            {points.map((point) => (
              <li key={point} className="flex gap-3 text-indigo-100">
                <CheckCircle2 className="mt-1 size-5 shrink-0 text-indigo-300" aria-hidden="true" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-sm text-indigo-200/80">
          {t("copyright", {
            year: formatNumber(new Date().getFullYear(), fmt, { useGrouping: false }),
            brand: BRAND.full,
          })}
        </p>
      </aside>
      <div className="flex flex-col">
        <header className="flex items-center justify-between gap-2 p-4 sm:p-6">
          <Logo className="lg:invisible" />
          <div className="flex items-center gap-1">
            <LocaleSwitcher compact />
            <ThemeToggle />
          </div>
        </header>
        <main id="main" className="flex flex-1 items-center justify-center px-4 pb-16 sm:px-6">
          <div className="animate-fade-up w-full max-w-md">{children}</div>
        </main>
      </div>
    </div>
  );
}

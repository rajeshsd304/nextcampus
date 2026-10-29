import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/lib/site";
import { LocaleSwitcher } from "./locale-switcher";
import { Logo } from "./logo";
import { MarketingMobileNav } from "./marketing-mobile-nav";
import { NavLink } from "./nav-link";
import { ThemeToggle } from "./theme-toggle";

export async function SiteHeader() {
  const t = await getTranslations("nav");
  return (
    <header className="border-border/70 bg-background/85 sticky top-0 z-40 border-b backdrop-blur-lg">
      <div className="container-page flex h-16 items-center justify-between gap-3">
        <div className="flex items-center gap-6">
          <Logo />
          <nav aria-label={t("mainLabel")} className="hidden lg:block">
            <ul className="flex items-center gap-1">
              {siteConfig.marketingNav.map((item) => (
                <li key={item.href}>
                  <NavLink
                    href={item.href}
                    className="text-muted-foreground hover:text-foreground aria-[current=page]:text-foreground inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-medium transition-colors"
                  >
                    {t(item.key)}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <LocaleSwitcher className="hidden md:inline-flex" />
          <ThemeToggle />
          <Button asChild variant="ghost" className="hidden sm:inline-flex">
            <Link href="/sign-in">{t("signIn")}</Link>
          </Button>
          <Button asChild className="hidden sm:inline-flex">
            <Link href="/sign-up">{t("getStarted")}</Link>
          </Button>
          <MarketingMobileNav localeSwitcher={<LocaleSwitcher compact />} />
        </div>
      </div>
    </header>
  );
}

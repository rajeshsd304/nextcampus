import Link from "next/link";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/lib/site";
import { Logo } from "./logo";
import { MarketingMobileNav } from "./marketing-mobile-nav";
import { NavLink } from "./nav-link";
import { ThemeToggle } from "./theme-toggle";

export function SiteHeader() {
  return (
    <header className="border-border/70 bg-background/80 sticky top-0 z-40 border-b backdrop-blur-lg">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-8">
          <Logo />
          <nav aria-label="Main" className="hidden lg:block">
            <ul className="flex items-center gap-1">
              {siteConfig.marketingNav.map((item) => (
                <li key={item.href}>
                  <NavLink
                    href={item.href}
                    className="text-muted-foreground hover:text-foreground aria-[current=page]:text-foreground rounded-lg px-3 py-2 text-sm font-medium transition-colors"
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <ThemeToggle />
          <Button asChild variant="ghost" className="hidden sm:inline-flex">
            <Link href="/sign-in">Sign in</Link>
          </Button>
          <Button asChild className="hidden sm:inline-flex">
            <Link href="/sign-up">Get started</Link>
          </Button>
          <MarketingMobileNav />
        </div>
      </div>
    </header>
  );
}

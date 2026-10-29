"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { siteConfig } from "@/lib/site";
import { NavLink } from "./nav-link";

export function MarketingMobileNav({ localeSwitcher }: { localeSwitcher: ReactNode }) {
  const t = useTranslations("nav");
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label={t("openMenu")}>
          <Menu aria-hidden="true" />
        </Button>
      </SheetTrigger>
      <SheetContent title={t("menu")} side="right">
        <nav aria-label={t("mobileLabel")}>
          <ul className="space-y-1">
            {siteConfig.marketingNav.map((item) => (
              <li key={item.href}>
                <NavLink
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="hover:bg-surface-muted aria-[current=page]:bg-accent aria-[current=page]:text-accent-foreground flex min-h-11 items-center rounded-lg px-3 font-medium"
                >
                  {t(item.key)}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="border-border border-t pt-4">{localeSwitcher}</div>
        <div className="mt-auto grid gap-2">
          <Button asChild variant="secondary">
            <Link href="/sign-in" onClick={() => setOpen(false)}>
              {t("signIn")}
            </Link>
          </Button>
          <Button asChild>
            <Link href="/sign-up" onClick={() => setOpen(false)}>
              {t("getStarted")}
            </Link>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

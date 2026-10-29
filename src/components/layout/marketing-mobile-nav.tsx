"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { siteConfig } from "@/lib/site";
import { NavLink } from "./nav-link";

export function MarketingMobileNav() {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
          <Menu aria-hidden="true" />
        </Button>
      </SheetTrigger>
      <SheetContent title="Menu" side="right">
        <nav aria-label="Mobile">
          <ul className="space-y-1">
            {siteConfig.marketingNav.map((item) => (
              <li key={item.href}>
                <NavLink
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="hover:bg-surface-muted aria-[current=page]:bg-accent aria-[current=page]:text-accent-foreground block rounded-lg px-3 py-2.5 font-medium"
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
            <li>
              <NavLink
                href="/contact"
                onClick={() => setOpen(false)}
                className="hover:bg-surface-muted block rounded-lg px-3 py-2.5 font-medium"
              >
                Contact
              </NavLink>
            </li>
          </ul>
        </nav>
        <div className="mt-auto grid gap-2">
          <Button asChild variant="secondary">
            <Link href="/sign-in" onClick={() => setOpen(false)}>
              Sign in
            </Link>
          </Button>
          <Button asChild>
            <Link href="/sign-up" onClick={() => setOpen(false)}>
              Get started
            </Link>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

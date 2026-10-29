import Link from "next/link";
import { siteConfig } from "@/lib/site";
import { Logo } from "./logo";

export function SiteFooter() {
  return (
    <footer className="border-border bg-surface border-t">
      <div className="container-page grid gap-10 py-12 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="space-y-3">
          <Logo />
          <p className="text-muted-foreground max-w-xs text-sm">{siteConfig.tagline}.</p>
        </div>
        {siteConfig.footerNav.map((group) => (
          <nav key={group.title} aria-label={group.title}>
            <h2 className="text-sm font-semibold">{group.title}</h2>
            <ul className="mt-3 space-y-2">
              {group.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-muted-foreground hover:text-foreground text-sm">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-border border-t">
        <div className="container-page text-muted-foreground flex flex-col gap-2 py-6 text-sm sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} NextCampus. All rights reserved.</p>
          <p>
            <a href={`mailto:${siteConfig.contactEmail}`} className="hover:text-foreground">
              {siteConfig.contactEmail}
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}

import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getFormatContext } from "@/features/preferences/server";
import { formatNumber } from "@/lib/i18n-format";
import { BRAND, siteConfig } from "@/lib/site";
import { LocaleSwitcher } from "./locale-switcher";
import { Logo } from "./logo";

export async function SiteFooter() {
  const t = await getTranslations("nav");
  const tf = await getTranslations("nav.footer");
  const fmt = await getFormatContext();
  const year = formatNumber(new Date().getFullYear(), fmt, { useGrouping: false });
  return (
    <footer className="border-border bg-surface border-t">
      <div className="container-page grid gap-10 py-12 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="space-y-4">
          <Logo />
          <p className="text-muted-foreground max-w-xs text-sm">{tf("tagline")}</p>
          <LocaleSwitcher />
        </div>
        {siteConfig.footerNav.map((group) => (
          <nav key={group.group} aria-label={tf(group.group)}>
            <h2 className="text-sm font-semibold">{tf(group.group)}</h2>
            <ul className="mt-2">
              {group.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-muted-foreground hover:text-foreground inline-flex min-h-11 items-center text-sm"
                  >
                    {t(link.key)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-border border-t">
        <div className="container-page text-muted-foreground flex flex-col gap-2 py-6 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p>{tf("copyright", { year, brand: BRAND.full })}</p>
          <a
            href={`mailto:${siteConfig.contactEmail}`}
            className="hover:text-foreground inline-flex min-h-11 items-center"
          >
            {siteConfig.contactEmail}
          </a>
        </div>
      </div>
    </footer>
  );
}

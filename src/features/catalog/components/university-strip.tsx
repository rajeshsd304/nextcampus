import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import type { CatalogUniversity } from "../types";
import { localized } from "../types";

/** Text-only list of active universities (no logos), read from the database. */
export async function UniversityStrip({ universities }: { universities: CatalogUniversity[] }) {
  const t = await getTranslations("home.universities");
  const locale = await getLocale();
  if (universities.length === 0) return null;

  return (
    <section aria-labelledby="universities-heading" className="border-border bg-surface border-b">
      <div className="container-page py-8">
        <h2 id="universities-heading" className="text-muted-foreground text-center text-sm font-semibold">
          {t("heading")}
        </h2>
        <ul className="mt-4 flex flex-wrap justify-center gap-2">
          {universities.map((u) => (
            <li key={u.id}>
              <Link
                href={`/exams/${u.slug}`}
                title={localized(u, "name", locale)}
                className="border-border bg-background text-foreground hover:border-primary hover:text-primary inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-semibold transition-colors dark:hover:text-indigo-300"
              >
                <span lang="en">{u.short_code}</span>
                <span className="sr-only">{` — ${localized(u, "name", locale)}`}</span>
              </Link>
            </li>
          ))}
        </ul>
        <p className="text-muted-foreground mt-4 text-center text-xs">{t("disclaimer")}</p>
      </div>
    </section>
  );
}

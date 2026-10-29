import { getTranslations } from "next-intl/server";
import { getFormatContext } from "@/features/preferences/server";
import { formatDate } from "@/lib/i18n-format";

/**
 * Renders a legal document from messages `legal.<doc>`: { title, intro,
 * sections: [{ heading, paragraphs?: string[], items?: string[] }] }.
 */
export async function LegalPage({
  doc,
  updated,
}: {
  doc: "privacy" | "terms" | "acceptableUse";
  updated: string;
}) {
  const t = await getTranslations(`legal.${doc}`);
  const tCommon = await getTranslations("legal");
  const fmt = await getFormatContext();
  const sections = t.raw("sections") as { heading: string; paragraphs?: string[]; items?: string[] }[];

  return (
    <article className="container-page max-w-3xl py-16 sm:py-20">
      <header className="border-border border-b pb-8">
        <p className="text-primary text-sm font-semibold dark:text-indigo-300">{tCommon("eyebrow")}</p>
        <h1 className="font-display mt-2 text-4xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground mt-3 text-sm">
          {tCommon("updated")}{" "}
          <time dateTime={updated}>{formatDate(updated, { ...fmt, timeZone: "UTC" })}</time>
        </p>
        <p className="text-muted-foreground mt-6 text-lg">{t("intro")}</p>
      </header>
      <div className="space-y-10 pt-10">
        {sections.map((section, index) => (
          <section key={section.heading} aria-labelledby={`legal-${index}`}>
            <h2 id={`legal-${index}`} className="font-display text-xl font-semibold">
              {section.heading}
            </h2>
            <div className="text-muted-foreground mt-3 space-y-3 leading-relaxed">
              {section.paragraphs?.map((p) => (
                <p key={p}>{p}</p>
              ))}
              {section.items ? (
                <ul className="space-y-2">
                  {section.items.map((item) => (
                    <li key={item} className="ml-5 list-disc pl-1">
                      {item}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </section>
        ))}
      </div>
    </article>
  );
}

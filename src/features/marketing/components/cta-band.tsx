import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";

export async function CtaBand() {
  const t = await getTranslations("marketing.cta");
  return (
    <section className="py-16 sm:py-24" aria-labelledby="cta-heading">
      <div className="container-page">
        <div className="bg-navy-950 relative overflow-hidden rounded-3xl px-6 py-14 text-center text-white sm:px-12">
          <div className="bg-hero-glow absolute inset-0" aria-hidden="true" />
          <div className="relative mx-auto max-w-2xl space-y-5">
            <h2
              id="cta-heading"
              className="font-display text-3xl font-semibold tracking-tight text-balance sm:text-4xl"
            >
              {t("title")}
            </h2>
            <p className="text-lg text-indigo-100">{t("body")}</p>
            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/sign-up">{t("primary")}</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="secondary"
                className="border-white/20 bg-white/10 text-white hover:bg-white/20"
              >
                <Link href="/exams">{t("secondary")}</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

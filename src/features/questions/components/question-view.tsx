import { CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNumber, type FormatContext } from "@/lib/i18n-format";
import { cn } from "@/lib/utils";
import { MathText } from "../math";
import type { QuestionDetail } from "../server/queries";

const LANGS = ["bn", "en"] as const;

/** Side-by-side bn/en rendering of a question with its answer data (authors/reviewers only). */
export function QuestionView({ detail, format }: { detail: QuestionDetail; format: FormatContext }) {
  const t = useTranslations("questions.view");
  const { question, options, answerKey, spec, modelAnswer, rubric, criteria, assets } = detail;
  const pick = (row: object | null, field: string, lang: (typeof LANGS)[number]): string => {
    if (!row) return "";
    const value = (row as Record<string, unknown>)[`${field}_${lang}`];
    return typeof value === "string" ? value : "";
  };
  const missing = <p className="text-muted-foreground text-sm italic">{t("missing")}</p>;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        {LANGS.map((lang) => (
          <Card key={lang}>
            <CardHeader>
              <CardTitle>{t(`language.${lang}`)}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <section aria-label={t("stem")}>
                {question[`stem_${lang}`] ? (
                  <MathText text={question[`stem_${lang}`]} lang={lang} />
                ) : (
                  missing
                )}
              </section>
              {question.type === "mcq" ? (
                <section aria-label={t("options")} className="space-y-2">
                  <ol className="space-y-2">
                    {options.map((option) => {
                      const correct = answerKey?.correct_option_id === option.id;
                      return (
                        <li
                          key={option.id}
                          className={cn(
                            "flex gap-3 rounded-xl border px-3 py-2.5",
                            correct
                              ? "border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40"
                              : "border-border",
                          )}
                        >
                          <span className="font-semibold" aria-hidden="true">
                            {option.label}
                          </span>
                          <span className="min-w-0 flex-1">
                            {option[`text_${lang}`] ? (
                              <MathText text={option[`text_${lang}`]} lang={lang} />
                            ) : (
                              missing
                            )}
                          </span>
                          {correct ? (
                            <span className="text-success inline-flex items-center gap-1 text-xs font-semibold">
                              <CheckCircle2 className="size-4" aria-hidden="true" />
                              {t("correct")}
                            </span>
                          ) : null}
                        </li>
                      );
                    })}
                  </ol>
                  <div className="bg-surface-muted rounded-xl p-3">
                    <p className="text-muted-foreground text-xs font-semibold uppercase">
                      {t("explanation")}
                    </p>
                    {pick(answerKey, "explanation", lang) ? (
                      <MathText
                        text={pick(answerKey, "explanation", lang)}
                        lang={lang}
                        className="mt-1 text-sm"
                      />
                    ) : (
                      missing
                    )}
                  </div>
                </section>
              ) : (
                <section className="space-y-4">
                  <div className="bg-surface-muted rounded-xl p-3">
                    <p className="text-muted-foreground text-xs font-semibold uppercase">
                      {t("modelAnswer")}
                    </p>
                    {pick(modelAnswer, "answer", lang) ? (
                      <MathText
                        text={pick(modelAnswer, "answer", lang)}
                        lang={lang}
                        className="mt-1 text-sm"
                      />
                    ) : (
                      missing
                    )}
                  </div>
                  {pick(rubric, "guidance", lang) ? (
                    <div>
                      <p className="text-muted-foreground text-xs font-semibold uppercase">{t("guidance")}</p>
                      <MathText text={pick(rubric, "guidance", lang)} lang={lang} className="mt-1 text-sm" />
                    </div>
                  ) : null}
                  <div>
                    <p className="text-muted-foreground text-xs font-semibold uppercase">{t("rubric")}</p>
                    {criteria.length === 0 ? (
                      missing
                    ) : (
                      <ol className="mt-2 space-y-1.5 text-sm">
                        {criteria.map((c) => (
                          <li key={c.id} className="flex justify-between gap-4">
                            <span>
                              {c[`text_${lang}`] ? (
                                <MathText text={c[`text_${lang}`]} lang={lang} />
                              ) : (
                                missing
                              )}
                            </span>
                            <span className="shrink-0 font-medium">
                              {t("marksShort", { marks: formatNumber(c.max_marks, format) })}
                            </span>
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                </section>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      {spec ? (
        <Card>
          <CardContent className="flex flex-wrap gap-6 pt-6 text-sm sm:pt-6">
            <p>
              <span className="text-muted-foreground">{t("answerMode")}</span>{" "}
              <span className="font-medium">{t(`answerModes.${spec.answer_mode}`)}</span>
            </p>
            {spec.word_limit ? (
              <p>{t("wordLimit", { count: formatNumber(spec.word_limit, format) })}</p>
            ) : null}
            {spec.char_limit ? (
              <p>{t("charLimit", { count: formatNumber(spec.char_limit, format) })}</p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
      {assets.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("images")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {assets.map((asset) =>
              asset.url ? (
                <figure key={asset.id} className="space-y-2">
                  {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL from private storage */}
                  <img
                    src={asset.url}
                    alt={asset.alt_bn || asset.alt_en}
                    className="border-border max-h-80 rounded-xl border object-contain"
                  />
                  <figcaption className="text-muted-foreground text-xs">
                    {[asset.alt_bn, asset.alt_en].filter(Boolean).join(" / ")}
                  </figcaption>
                </figure>
              ) : null,
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

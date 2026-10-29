"use client";

import { Download } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useId, useState, useTransition } from "react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Spinner } from "@/components/ui/misc";
import { useMessageText } from "@/i18n/use-message-text";
import { importQuestionsAction, type ImportOutcome, type ImportReport } from "../actions";
import type { BankRef } from "../server/context";

const TONES: Record<ImportOutcome, "success" | "warning" | "danger" | "neutral" | "indigo"> = {
  valid: "indigo",
  created: "success",
  updated: "success",
  unchanged: "neutral",
  skipped: "warning",
  error: "danger",
};

export function ImportForm({ bank, basePath }: { bank: BankRef; basePath: string }) {
  const t = useTranslations("questionImport");
  const text = useMessageText();
  const fileId = useId();
  const [pending, startTransition] = useTransition();
  const [report, setReport] = useState<ImportReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = (formData: FormData) => {
    setError(null);
    formData.set("bank", JSON.stringify(bank));
    startTransition(async () => {
      const result = await importQuestionsAction(formData);
      if (result.ok) setReport(result.data);
      else {
        setReport(null);
        setError(text(result.error.fieldErrors?.file?.[0] ?? `errors.${result.error.code}`) ?? null);
      }
    });
  };

  const counts = report?.rows.reduce<Record<string, number>>(
    (acc, row) => ({ ...acc, [row.outcome]: (acc[row.outcome] ?? 0) + 1 }),
    {},
  );

  return (
    <div className="space-y-6">
      <form action={submit} className="border-border bg-surface space-y-4 rounded-2xl border p-5 shadow-xs">
        <div className="space-y-1.5">
          <Label htmlFor={fileId}>{t("file")}</Label>
          <Input
            id={fileId}
            name="file"
            type="file"
            accept=".csv,text/csv"
            required
            className="h-auto py-2.5"
            aria-describedby={`${fileId}-hint`}
          />
          <p id={`${fileId}-hint`} className="text-muted-foreground text-sm">
            {t("fileHint")}
          </p>
        </div>
        <label className="flex min-h-11 items-start gap-3">
          <input
            type="checkbox"
            name="dryRun"
            defaultChecked
            className="mt-1 size-5 shrink-0 accent-indigo-600"
          />
          <span className="text-sm">
            <span className="font-medium">{t("dryRun")}</span>
            <span className="text-muted-foreground block">{t("dryRunHint")}</span>
          </span>
        </label>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? <Spinner label={t("processing")} /> : null}
            {t("submit")}
          </Button>
          <Button asChild variant="secondary">
            <a href="/templates/question-import-template.csv" download>
              <Download aria-hidden="true" />
              {t("template")}
            </a>
          </Button>
        </div>
      </form>

      {error ? (
        <Alert tone="danger" live>
          {error}
        </Alert>
      ) : null}

      {report ? (
        <section aria-labelledby="import-report" className="space-y-3">
          <h2 id="import-report" className="text-lg font-semibold">
            {report.dryRun ? t("reportDryRun") : t("reportImported")}
          </h2>
          <p className="text-muted-foreground text-sm" role="status">
            {Object.entries(counts ?? {})
              .map(([outcome, count]) =>
                t("summary", { count, outcome: t(`outcomes.${outcome as ImportOutcome}`) }),
              )
              .join(" · ")}
          </p>
          <div className="border-border overflow-x-auto rounded-2xl border">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <caption className="sr-only">{t("tableCaption")}</caption>
              <thead className="bg-surface-muted text-muted-foreground text-xs uppercase">
                <tr>
                  <th scope="col" className="px-3 py-2">
                    {t("columns.row")}
                  </th>
                  <th scope="col" className="px-3 py-2">
                    {t("columns.externalId")}
                  </th>
                  <th scope="col" className="px-3 py-2">
                    {t("columns.outcome")}
                  </th>
                  <th scope="col" className="px-3 py-2">
                    {t("columns.details")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                {report.rows.map((row) => (
                  <tr key={row.row}>
                    <td className="px-3 py-2 tabular-nums">{t("rowNumber", { row: row.row })}</td>
                    <td className="px-3 py-2 font-mono text-xs" lang="en">
                      {row.questionId ? (
                        <Link href={`${basePath}/${row.questionId}`} className="underline">
                          {row.externalId}
                        </Link>
                      ) : (
                        row.externalId
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <Badge tone={TONES[row.outcome]}>{t(`outcomes.${row.outcome}`)}</Badge>
                    </td>
                    <td className="px-3 py-2">
                      <ul className="space-y-0.5">
                        {row.issues.map((issue, index) => (
                          <li key={index}>
                            {issue.column ? (
                              <span className="font-mono text-xs" lang="en">{`${issue.column}: `}</span>
                            ) : null}
                            {text(issue.code)}
                          </li>
                        ))}
                        {row.duplicates > 0 ? (
                          <li className="text-warning">{t("duplicates", { count: row.duplicates })}</li>
                        ) : null}
                      </ul>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}

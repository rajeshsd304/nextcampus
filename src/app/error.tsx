"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("errorPage");
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main
      id="main"
      className="container-page flex min-h-[70dvh] flex-col items-center justify-center py-24 text-center"
    >
      <h1 className="font-display text-3xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="text-muted-foreground mt-3 max-w-md" role="alert">
        {t("body")}
        {error.digest ? (
          <span className="mt-2 block text-xs">{t("reference", { digest: error.digest })}</span>
        ) : null}
      </p>
      <Button className="mt-8" onClick={reset}>
        {t("retry")}
      </Button>
    </main>
  );
}

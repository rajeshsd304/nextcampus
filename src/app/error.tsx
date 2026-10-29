"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main
      id="main"
      className="container-page flex min-h-[70dvh] flex-col items-center justify-center py-24 text-center"
    >
      <h1 className="font-display text-3xl font-semibold tracking-tight">Something went wrong</h1>
      <p className="text-muted-foreground mt-3 max-w-md" role="alert">
        We couldn&apos;t load this page. Please try again.
        {error.digest ? <span className="mt-2 block text-xs">Reference: {error.digest}</span> : null}
      </p>
      <Button className="mt-8" onClick={reset}>
        Try again
      </Button>
    </main>
  );
}

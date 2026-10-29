"use client";

import bn from "../../messages/bn.json";
import en from "../../messages/en.json";

/**
 * Replaces the root layout when it fails, so no i18n provider is available:
 * show both languages, read directly from the message files.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="bn">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          display: "grid",
          placeItems: "center",
          minHeight: "100dvh",
          margin: 0,
        }}
      >
        <main style={{ textAlign: "center", padding: 24, lineHeight: 1.7 }}>
          <h1>{bn.globalError.title}</h1>
          <p lang="en">{en.globalError.title}</p>
          <p role="alert">
            {error.digest ? `${bn.globalError.reference} ${error.digest}` : bn.globalError.body}
          </p>
          <button
            type="button"
            onClick={reset}
            style={{ padding: "12px 20px", borderRadius: 10, minHeight: 44 }}
          >
            {`${bn.globalError.retry} / ${en.globalError.retry}`}
          </button>
        </main>
      </body>
    </html>
  );
}

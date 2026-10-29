"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          display: "grid",
          placeItems: "center",
          minHeight: "100dvh",
          margin: 0,
        }}
      >
        <main style={{ textAlign: "center", padding: 24 }}>
          <h1>NextCampus is temporarily unavailable</h1>
          <p role="alert">An unexpected error occurred.{error.digest ? ` Reference: ${error.digest}` : ""}</p>
          <button type="button" onClick={reset} style={{ padding: "10px 18px", borderRadius: 10 }}>
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}

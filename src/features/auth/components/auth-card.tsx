import type { ReactNode } from "react";

export function AuthHeading({ title, description }: { title: string; description?: ReactNode }) {
  return (
    <div className="mb-8 space-y-2">
      <h1 className="font-display text-3xl font-semibold tracking-tight">{title}</h1>
      {description ? <p className="text-muted-foreground">{description}</p> : null}
    </div>
  );
}

export function Divider({ label }: { label: string }) {
  return (
    <div className="text-muted-foreground my-6 flex items-center gap-3 text-xs font-medium tracking-wide uppercase">
      <span className="bg-border h-px flex-1" />
      {label}
      <span className="bg-border h-px flex-1" />
    </div>
  );
}

/** `?error=` codes the auth pages understand. Text: messages `authPages.urlErrors.<code>`. */
export const AUTH_URL_ERRORS = [
  "oauth_failed",
  "oauth_cancelled",
  "oauth_unavailable",
  "link_invalid",
  "link_expired",
] as const;
export type AuthUrlError = (typeof AUTH_URL_ERRORS)[number];

export function isAuthUrlError(value: unknown): value is AuthUrlError {
  return typeof value === "string" && (AUTH_URL_ERRORS as readonly string[]).includes(value);
}

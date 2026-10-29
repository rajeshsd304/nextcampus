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

export const AUTH_ERROR_MESSAGES: Record<string, string> = {
  oauth_failed: "Google sign-in didn't complete. Please try again.",
  oauth_unavailable: "Google sign-in is temporarily unavailable. Try email and password instead.",
  link_invalid: "That link is invalid. Request a new one below.",
  link_expired: "That link has expired or was already used. Please sign in or request a new link.",
};

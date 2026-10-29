export const DEFAULT_AUTHENTICATED_PATH = "/dashboard";

/**
 * Returns a same-origin relative path that is safe to redirect to after
 * authentication, or the fallback. Rejects absolute URLs to other origins,
 * protocol-relative URLs (`//evil.com`), backslash tricks (`/\evil.com`),
 * control characters and auth-flow loops.
 */
export function safeRedirectPath(
  candidate: string | null | undefined,
  options: { fallback?: string; origin?: string } = {},
): string {
  const fallback = options.fallback ?? DEFAULT_AUTHENTICATED_PATH;
  if (!candidate) return fallback;

  let value = candidate.trim();
  if (options.origin && /^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      if (url.origin !== new URL(options.origin).origin) return fallback;
      value = `${url.pathname}${url.search}${url.hash}`;
    } catch {
      return fallback;
    }
  }

  if (/[\u0000-\u001f\u007f]/.test(value)) return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  if (value.includes("\\")) return fallback;

  // Reject percent-encoded control characters, backslashes and leading slashes
  // that downstream decoders could turn into the patterns above.
  let decoded: string;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return fallback;
  }
  if (/[\u0000-\u001f\u007f\\]/.test(decoded) || decoded.startsWith("//")) return fallback;

  try {
    // Resolve against a dummy origin: anything that escapes it is rejected.
    const resolved = new URL(value, "https://nextcampus.invalid");
    if (resolved.origin !== "https://nextcampus.invalid") return fallback;
    const path = `${resolved.pathname}${resolved.search}${resolved.hash}`;
    if (/^\/(sign-in|sign-up|auth\/)/.test(resolved.pathname)) return fallback;
    return path;
  } catch {
    return fallback;
  }
}

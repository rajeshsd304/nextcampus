import { useTranslations } from "next-intl";

/**
 * Translates a message key that arrives as data (Zod issue messages, server
 * action results). Unknown keys are returned unchanged. Works in Server and
 * Client Components; on the client only CLIENT_NAMESPACES are available.
 */
export function useMessageText(): (key: string | undefined) => string | undefined {
  const t = useTranslations();
  return (key) => {
    if (!key) return undefined;
    return t.has(key as never) ? t(key as never) : key;
  };
}

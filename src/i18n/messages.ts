import type en from "../../messages/en.json";
import type { Locale } from "./config";

export type Messages = typeof en;

export async function loadMessages(locale: Locale): Promise<Messages> {
  return (await import(`../../messages/${locale}.json`)).default as Messages;
}

/**
 * Namespaces needed by Client Components. Only these are serialized to the
 * browser, keeping long-form marketing and legal copy server-only.
 */
export const CLIENT_NAMESPACES = [
  "common",
  "errors",
  "validation",
  "theme",
  "locale",
  "nav",
  "roles",
  "authForms",
  "shell",
  "notifications",
  "orgForms",
  "invitationForms",
  "profileForm",
  "contactForm",
  "catalogAdmin",
  "questionForms",
  "questionImport",
  "questionLabels",
  "platformAdmins",
  "errorPage",
] as const satisfies readonly (keyof Messages)[];

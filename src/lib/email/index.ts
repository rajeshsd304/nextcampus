import "server-only";
import { getServerEnv } from "@/lib/env";
import { ConsoleEmailProvider, ResendEmailProvider } from "./providers";
import type { EmailProvider } from "./types";

export type { EmailMessage, EmailProvider, EmailSendResult } from "./types";

let provider: EmailProvider | undefined;

export function getEmailProvider(): EmailProvider {
  if (provider) return provider;
  const env = getServerEnv();
  provider =
    env.EMAIL_PROVIDER === "resend" && env.RESEND_API_KEY
      ? new ResendEmailProvider(env.RESEND_API_KEY, env.EMAIL_FROM)
      : new ConsoleEmailProvider();
  return provider;
}

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
};

export type EmailSendResult = { ok: true; id: string | null } | { ok: false; reason: string };

/** Transactional email provider abstraction. Implementations must never throw. */
export interface EmailProvider {
  readonly name: string;
  send(message: EmailMessage): Promise<EmailSendResult>;
}

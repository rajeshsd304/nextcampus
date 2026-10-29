import type { EmailMessage, EmailProvider, EmailSendResult } from "./types";

/** Development provider: logs the message instead of sending it. */
export class ConsoleEmailProvider implements EmailProvider {
  readonly name = "console";

  async send(message: EmailMessage): Promise<EmailSendResult> {
    console.info(`[email:console] to=${message.to} subject="${message.subject}"\n${message.text}`);
    return { ok: true, id: null };
  }
}

/** Resend HTTP API provider (https://resend.com/docs/api-reference/emails/send-email). */
export class ResendEmailProvider implements EmailProvider {
  readonly name = "resend";

  constructor(
    private readonly apiKey: string,
    private readonly from: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async send(message: EmailMessage): Promise<EmailSendResult> {
    try {
      const response = await this.fetchImpl("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: this.from,
          to: [message.to],
          subject: message.subject,
          html: message.html,
          text: message.text,
          ...(message.replyTo ? { reply_to: message.replyTo } : {}),
        }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) return { ok: false, reason: `resend_http_${response.status}` };
      const body = (await response.json()) as { id?: unknown };
      return { ok: true, id: typeof body.id === "string" ? body.id : null };
    } catch (error) {
      return { ok: false, reason: error instanceof Error ? error.name : "unknown" };
    }
  }
}

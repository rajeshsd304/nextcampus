import type { EmailMessage } from "./types";

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
}

function layout(title: string, bodyHtml: string, tagline: string): string {
  return `<!doctype html><html><body style="margin:0;background:#f5f7fb;font-family:'Hind Siliguri',Inter,Segoe UI,Arial,sans-serif;color:#0b1430">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;padding:32px">
<tr><td><p style="margin:0 0 24px;font-weight:700;font-size:18px;color:#1e1b4b">NextCampus</p>
<h1 style="margin:0 0 16px;font-size:22px;line-height:1.5">${escapeHtml(title)}</h1>${bodyHtml}
<p style="margin:32px 0 0;font-size:12px;color:#5b6478">${escapeHtml(tagline)}</p></td></tr></table></td></tr></table></body></html>`;
}

type InvitationValues = {
  organization: string;
  role: string;
  inviter: string;
  email: string;
  expires: string;
};

/** Localized copy for the invitation email (from messages `email.invitation`). */
export type InvitationCopy = {
  subject: (values: Pick<InvitationValues, "organization">) => string;
  body: (values: Pick<InvitationValues, "organization" | "role" | "inviter">) => string;
  button: string;
  footer: (values: Pick<InvitationValues, "email" | "expires">) => string;
  tagline: string;
};

/** English copy, used when no translator is available. */
export const DEFAULT_INVITATION_COPY: InvitationCopy = {
  subject: ({ organization }) => `You're invited to join ${organization} on NextCampus`,
  body: ({ inviter, organization, role }) => `${inviter} invited you to join ${organization} as ${role}.`,
  button: "Review invitation",
  footer: ({ email, expires }) => `This invitation is for ${email} and expires ${expires}.`,
  tagline: "Admission preparation you can trust.",
};

export function invitationEmail(
  input: {
    to: string;
    organizationName: string;
    roleLabel: string;
    inviterName: string;
    acceptUrl: string;
    expiresAt: string;
  },
  copy: InvitationCopy = DEFAULT_INVITATION_COPY,
): EmailMessage {
  const expires = new Date(input.expiresAt).toUTCString();
  const subject = copy.subject({ organization: input.organizationName });
  const body = copy.body({
    inviter: input.inviterName,
    organization: input.organizationName,
    role: input.roleLabel,
  });
  const footer = copy.footer({ email: input.to, expires });
  const html = layout(
    subject,
    `<p style="line-height:1.7">${escapeHtml(body)}</p>
<p style="margin:24px 0"><a href="${escapeHtml(input.acceptUrl)}" style="background:#4f46e5;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:600">${escapeHtml(copy.button)}</a></p>
<p style="font-size:13px;color:#5b6478">${escapeHtml(footer)}</p>`,
    copy.tagline,
  );
  const text = `${body}\n\n${copy.button}: ${input.acceptUrl}\n\n${footer}`;
  return { to: input.to, subject, html, text };
}

/** Internal staff notification; always English. */
export function contactNotificationEmail(input: {
  to: string;
  name: string;
  email: string;
  organization: string | null;
  topic: string;
  message: string;
}): EmailMessage {
  const subject = `New ${input.topic} enquiry from ${input.name}`;
  const html = layout(
    subject,
    `<p><strong>${escapeHtml(input.name)}</strong> &lt;${escapeHtml(input.email)}&gt;${
      input.organization ? ` — ${escapeHtml(input.organization)}` : ""
    }</p><p style="white-space:pre-wrap;line-height:1.6">${escapeHtml(input.message)}</p>`,
    DEFAULT_INVITATION_COPY.tagline,
  );
  const text = `${input.name} <${input.email}>${input.organization ? ` — ${input.organization}` : ""}\n\n${input.message}`;
  return { to: input.to, subject, html, text, replyTo: input.email };
}

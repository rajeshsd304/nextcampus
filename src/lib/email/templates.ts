import type { EmailMessage } from "./types";

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
}

function layout(title: string, bodyHtml: string): string {
  return `<!doctype html><html><body style="margin:0;background:#f5f7fb;font-family:Inter,Segoe UI,Arial,sans-serif;color:#0b1430">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;padding:32px">
<tr><td><p style="margin:0 0 24px;font-weight:700;font-size:18px;color:#1e1b4b">NextCampus</p>
<h1 style="margin:0 0 16px;font-size:22px">${escapeHtml(title)}</h1>${bodyHtml}
<p style="margin:32px 0 0;font-size:12px;color:#5b6478">Secure, trusted digital assessments.</p></td></tr></table></td></tr></table></body></html>`;
}

export function invitationEmail(input: {
  to: string;
  organizationName: string;
  roleLabel: string;
  inviterName: string;
  acceptUrl: string;
  expiresAt: string;
}): EmailMessage {
  const subject = `You're invited to join ${input.organizationName} on NextCampus`;
  const expires = new Date(input.expiresAt).toUTCString();
  const html = layout(
    subject,
    `<p style="line-height:1.6">${escapeHtml(input.inviterName)} invited you to join <strong>${escapeHtml(
      input.organizationName,
    )}</strong> as <strong>${escapeHtml(input.roleLabel)}</strong>.</p>
<p style="margin:24px 0"><a href="${escapeHtml(input.acceptUrl)}" style="background:#4f46e5;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:600">Review invitation</a></p>
<p style="font-size:13px;color:#5b6478">This invitation is for ${escapeHtml(input.to)} and expires ${escapeHtml(expires)}.</p>`,
  );
  const text = `${input.inviterName} invited you to join ${input.organizationName} as ${input.roleLabel}.\n\nReview invitation: ${input.acceptUrl}\n\nThis invitation is for ${input.to} and expires ${expires}.`;
  return { to: input.to, subject, html, text };
}

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
  );
  const text = `${input.name} <${input.email}>${input.organization ? ` — ${input.organization}` : ""}\n\n${input.message}`;
  return { to: input.to, subject, html, text, replyTo: input.email };
}

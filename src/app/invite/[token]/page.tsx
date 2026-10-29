import { MailWarning } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/misc";
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from "@/features/access/roles";
import { getViewer } from "@/features/auth/server/session";
import { InvitationResponse } from "@/features/invitations/components/invitation-response";
import { getInvitationPreview } from "@/features/invitations/server/queries";

export const metadata: Metadata = {
  title: "Invitation",
  robots: { index: false, follow: false },
  // The URL contains a secret token: never leak it via the Referer header.
  referrer: "no-referrer",
};

export default async function InvitationLandingPage({ params }: PageProps<"/invite/[token]">) {
  const { token } = await params;
  const [preview, viewer] = await Promise.all([getInvitationPreview(token), getViewer()]);
  const returnTo = `/invite/${token}`;

  let body;
  if (!preview) {
    body = (
      <EmptyState
        icon={<MailWarning />}
        title="Invitation not found"
        description="This link is invalid. Check that you copied the full link, or ask the sender for a new invitation."
      />
    );
  } else {
    const unavailable =
      preview.status !== "pending"
        ? "This invitation has already been used, declined or revoked."
        : preview.is_expired
          ? "This invitation has expired. Ask an administrator to send a new one."
          : null;

    body = (
      <div className="space-y-6">
        <div className="space-y-2 text-center">
          <p className="text-primary text-sm font-semibold dark:text-indigo-300">You&apos;re invited</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            Join {preview.organization_name}
          </h1>
          <p className="text-muted-foreground">
            as <Badge tone="indigo">{ROLE_LABELS[preview.role]}</Badge>
          </p>
          <p className="text-muted-foreground text-sm">{ROLE_DESCRIPTIONS[preview.role]}</p>
        </div>
        <p className="text-muted-foreground text-center text-sm">
          This invitation is for <strong className="text-foreground">{preview.email_hint}</strong>.
        </p>
        {unavailable ? (
          <Alert tone="warning">{unavailable}</Alert>
        ) : !viewer ? (
          <div className="grid gap-2 sm:grid-cols-2">
            <Button asChild>
              <Link href={`/sign-up?next=${encodeURIComponent(returnTo)}`}>Create account</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href={`/sign-in?next=${encodeURIComponent(returnTo)}`}>Sign in</Link>
            </Button>
          </div>
        ) : !viewer.user.emailConfirmed ? (
          <Alert tone="warning">Verify your email address first, then return to this link.</Alert>
        ) : (
          <div className="space-y-3">
            <p className="text-muted-foreground text-center text-sm">Signed in as {viewer.user.email}</p>
            <div className="flex justify-center">
              <InvitationResponse target={{ kind: "token", token }} />
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-hero-glow min-h-dvh">
      <header className="mx-auto flex max-w-5xl items-center p-4 sm:p-6">
        <Logo />
      </header>
      <main id="main" className="mx-auto max-w-lg px-4 pb-20 sm:px-6">
        <Card className="animate-fade-up">
          <CardContent className="p-6 sm:p-8">{body}</CardContent>
        </Card>
      </main>
    </div>
  );
}

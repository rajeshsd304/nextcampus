import { MailWarning } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { Logo } from "@/components/layout/logo";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/misc";
import { ORG_ROLE_DISPLAY } from "@/features/access/roles";
import { getViewer } from "@/features/auth/server/session";
import { InvitationResponse } from "@/features/invitations/components/invitation-response";
import { getInvitationPreview } from "@/features/invitations/server/queries";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("invitePage");
  return {
    title: t("metaTitle"),
    robots: { index: false, follow: false },
    // The URL contains a secret token: never leak it via the Referer header.
    referrer: "no-referrer",
  };
}

export default async function InvitationLandingPage({ params }: PageProps<"/invite/[token]">) {
  const { token } = await params;
  const [preview, viewer, t, tRoles] = await Promise.all([
    getInvitationPreview(token),
    getViewer(),
    getTranslations("invitePage"),
    getTranslations("roles"),
  ]);
  const returnTo = `/invite/${token}`;

  let body;
  if (!preview) {
    body = <EmptyState icon={<MailWarning />} title={t("notFoundTitle")} description={t("notFoundBody")} />;
  } else {
    const display = ORG_ROLE_DISPLAY[preview.role];
    const unavailable = preview.status !== "pending" ? t("used") : preview.is_expired ? t("expired") : null;

    body = (
      <div className="space-y-6">
        <div className="space-y-2 text-center">
          <p className="text-primary text-sm font-semibold dark:text-indigo-300">{t("eyebrow")}</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            {t("title", { organization: preview.organization_name })}
          </h1>
          <p className="text-muted-foreground">
            {t.rich("asRole", { role: () => <Badge tone="indigo">{tRoles(`${display}.label`)}</Badge> })}
          </p>
          <p className="text-muted-foreground text-sm">{tRoles(`${display}.description`)}</p>
        </div>
        <p className="text-muted-foreground text-center text-sm">
          {t.rich("forEmail", {
            email: preview.email_hint,
            strong: (chunks) => <strong className="text-foreground">{chunks}</strong>,
          })}
        </p>
        {unavailable ? (
          <Alert tone="warning">{unavailable}</Alert>
        ) : !viewer ? (
          <div className="grid gap-2 sm:grid-cols-2">
            <Button asChild>
              <Link href={`/sign-up?next=${encodeURIComponent(returnTo)}`}>{t("createAccount")}</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href={`/sign-in?next=${encodeURIComponent(returnTo)}`}>{t("signIn")}</Link>
            </Button>
          </div>
        ) : !viewer.user.emailConfirmed ? (
          <Alert tone="warning">{t("verifyFirst")}</Alert>
        ) : (
          <div className="space-y-3">
            <p className="text-muted-foreground text-center text-sm">
              {t("signedInAs", { email: viewer.user.email })}
            </p>
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
      <header className="mx-auto flex max-w-5xl items-center justify-between gap-2 p-4 sm:p-6">
        <Logo />
        <LocaleSwitcher compact />
      </header>
      <main id="main" className="mx-auto max-w-lg px-4 pb-20 sm:px-6">
        <Card className="animate-fade-up">
          <CardContent className="p-6 sm:p-8">{body}</CardContent>
        </Card>
      </main>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ORG_ROLE_DISPLAY } from "@/features/access/roles";
import { requireViewer } from "@/features/auth/server/session";
import { InvitationResponse } from "@/features/invitations/components/invitation-response";
import { listMyInvitations } from "@/features/invitations/server/queries";
import { CreateOrganizationForm } from "@/features/organizations/components/create-organization-form";
import { JoinPublicButton } from "@/features/organizations/components/join-public-button";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("onboarding.workspace");
  return { title: t("title") };
}

export default async function OnboardingOrganizationPage() {
  const viewer = await requireViewer({ returnTo: "/onboarding/organization" });
  const [t, tRoles, invitations] = await Promise.all([
    getTranslations("onboarding.workspace"),
    getTranslations("roles"),
    listMyInvitations(),
  ]);
  const inPublic = viewer.memberships.some((m) => m.organization.is_system);

  return (
    <div className="animate-fade-up space-y-6 pt-6">
      <div className="space-y-2">
        <h1 className="font-display text-3xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>

      {!inPublic ? (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle>{t("publicTitle")}</CardTitle>
            <CardDescription>{t("publicBody")}</CardDescription>
          </CardHeader>
          <CardContent>
            <JoinPublicButton />
          </CardContent>
        </Card>
      ) : null}

      {invitations.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("invitationsTitle")}</CardTitle>
            <CardDescription>{t("invitationsFor", { email: viewer.user.email })}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {invitations.map((invitation) => (
              <div key={invitation.invitation_id} className="border-border space-y-3 rounded-xl border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">{invitation.organization_name}</p>
                  <Badge tone="indigo">{tRoles(`${ORG_ROLE_DISPLAY[invitation.role]}.label`)}</Badge>
                </div>
                <InvitationResponse target={{ kind: "id", invitationId: invitation.invitation_id }} />
              </div>
            ))}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{t("waitingTitle")}</CardTitle>
            <CardDescription>
              {t.rich("waitingBody", {
                email: viewer.user.email,
                strong: (chunks) => <strong className="text-foreground">{chunks}</strong>,
                inbox: (chunks) => (
                  <Link
                    href="/invitations"
                    className="text-primary font-medium hover:underline dark:text-indigo-300"
                  >
                    {chunks}
                  </Link>
                ),
              })}
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <details className="group border-border bg-surface rounded-2xl border shadow-xs">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 p-5 font-semibold sm:p-6 [&::-webkit-details-marker]:hidden">
          <span>
            {t("createTitle")}
            <span className="text-muted-foreground block text-sm font-normal">{t("createBody")}</span>
          </span>
          <span
            className="text-muted-foreground text-xl leading-none transition-transform group-open:rotate-45"
            aria-hidden="true"
          >
            +
          </span>
        </summary>
        <div className="px-5 pb-6 sm:px-6">
          <CreateOrganizationForm />
        </div>
      </details>
    </div>
  );
}

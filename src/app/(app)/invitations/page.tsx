import { MailOpen } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { ORG_ROLE_DISPLAY } from "@/features/access/roles";
import { requireViewer } from "@/features/auth/server/session";
import { InvitationResponse } from "@/features/invitations/components/invitation-response";
import { listMyInvitations } from "@/features/invitations/server/queries";
import { getFormatContext } from "@/features/preferences/server";
import { formatDateTime } from "@/lib/i18n-format";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("myInvitations");
  return { title: t("title") };
}

export default async function MyInvitationsPage() {
  const viewer = await requireViewer({ returnTo: "/invitations" });
  const [t, tRoles, fmt, invitations] = await Promise.all([
    getTranslations("myInvitations"),
    getTranslations("roles"),
    getFormatContext(viewer.profile.timezone),
    listMyInvitations(),
  ]);

  return (
    <main id="main" className="mx-auto max-w-3xl space-y-6">
      <PageHeader title={t("title")} description={t("description", { email: viewer.user.email })} />
      {invitations.length === 0 ? (
        <EmptyState
          icon={<MailOpen />}
          title={t("emptyTitle")}
          description={t("emptyDescription")}
          action={
            <Link
              href="/onboarding/organization"
              className="text-primary inline-flex min-h-11 items-center font-semibold hover:underline dark:text-indigo-300"
            >
              {t("emptyCta")}
            </Link>
          }
        />
      ) : (
        <Card>
          <ul className="divide-border divide-y">
            {invitations.map((invitation) => (
              <li key={invitation.invitation_id} className="space-y-4 p-5">
                <div>
                  <p className="font-semibold">{invitation.organization_name}</p>
                  <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-2 text-sm">
                    <Badge tone="indigo">{tRoles(`${ORG_ROLE_DISPLAY[invitation.role]}.label`)}</Badge>
                    {invitation.invited_by_name ? (
                      <span>{t("invitedBy", { name: invitation.invited_by_name })}</span>
                    ) : null}
                    <span>{t("expires", { date: formatDateTime(invitation.expires_at, fmt) })}</span>
                  </div>
                </div>
                <InvitationResponse target={{ kind: "id", invitationId: invitation.invitation_id }} />
              </li>
            ))}
          </ul>
        </Card>
      )}
    </main>
  );
}

import { Mail } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { ORG_ROLE_DISPLAY } from "@/features/access/roles";
import { InviteForm } from "@/features/invitations/components/invite-form";
import { RevokeInvitationButton } from "@/features/invitations/components/revoke-invitation-button";
import { listOrganizationInvitations, type OrgInvitation } from "@/features/invitations/server/queries";
import { requireOrgPermission } from "@/features/organizations/server/context";
import { getFormatContext } from "@/features/preferences/server";
import { formatDateTime } from "@/lib/i18n-format";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("invitationsPage");
  return { title: t("title") };
}

const TONES = { pending: "indigo", accepted: "success", declined: "warning", revoked: "neutral" } as const;

export default async function InvitationsPage({ params }: PageProps<"/o/[orgSlug]/admin/invitations">) {
  const { orgSlug } = await params;
  const { viewer, membership } = await requireOrgPermission(orgSlug, "invitations.manage");
  const [t, tRoles, fmt, invitations] = await Promise.all([
    getTranslations("invitationsPage"),
    getTranslations("roles"),
    getFormatContext(viewer.profile.timezone),
    listOrganizationInvitations(membership.organizationId),
  ]);

  const badge = (invitation: OrgInvitation) =>
    invitation.status === "pending" && invitation.isExpired ? (
      <Badge tone="neutral">{t("status.expired")}</Badge>
    ) : (
      <Badge tone={TONES[invitation.status]}>{t(`status.${invitation.status}`)}</Badge>
    );

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("description")} />
      <Card>
        <CardHeader>
          <CardTitle>{t("formTitle")}</CardTitle>
          <CardDescription>
            {t("formDescription", { organization: membership.organization.name })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InviteForm organizationId={membership.organizationId} />
        </CardContent>
      </Card>
      <section aria-labelledby="invitation-history">
        <h2 id="invitation-history" className="mb-3 text-base font-semibold">
          {t("historyTitle")}
        </h2>
        {invitations.length === 0 ? (
          <EmptyState icon={<Mail />} title={t("emptyTitle")} description={t("emptyDescription")} />
        ) : (
          <Card>
            <ul className="divide-border divide-y">
              {invitations.map((invitation) => (
                <li
                  key={invitation.id}
                  className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{invitation.email}</p>
                    <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-2 text-xs">
                      {badge(invitation)}
                      <span>{tRoles(`${ORG_ROLE_DISPLAY[invitation.role]}.label`)}</span>
                      <span>{t("sent", { date: formatDateTime(invitation.created_at, fmt) })}</span>
                      {invitation.status === "pending" ? (
                        <span>{t("expires", { date: formatDateTime(invitation.expires_at, fmt) })}</span>
                      ) : null}
                    </div>
                  </div>
                  {invitation.status === "pending" && !invitation.isExpired ? (
                    <RevokeInvitationButton invitationId={invitation.id} email={invitation.email} />
                  ) : null}
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>
    </div>
  );
}

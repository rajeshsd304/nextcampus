import { Mail } from "lucide-react";
import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { ROLE_LABELS } from "@/features/access/roles";
import { InviteForm } from "@/features/invitations/components/invite-form";
import { RevokeInvitationButton } from "@/features/invitations/components/revoke-invitation-button";
import { listOrganizationInvitations, type OrgInvitation } from "@/features/invitations/server/queries";
import { requireOrgPermission } from "@/features/organizations/server/context";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Invitations" };

function statusBadge(invitation: OrgInvitation) {
  if (invitation.status === "pending" && invitation.isExpired) {
    return <Badge tone="neutral">Expired</Badge>;
  }
  const tones = { pending: "indigo", accepted: "success", declined: "warning", revoked: "neutral" } as const;
  const labels = {
    pending: "Pending",
    accepted: "Accepted",
    declined: "Declined",
    revoked: "Revoked",
  } as const;
  return <Badge tone={tones[invitation.status]}>{labels[invitation.status]}</Badge>;
}

export default async function InvitationsPage({ params }: PageProps<"/o/[orgSlug]/admin/invitations">) {
  const { orgSlug } = await params;
  const { viewer, membership } = await requireOrgPermission(orgSlug, "invitations.manage");
  const invitations = await listOrganizationInvitations(membership.organizationId);
  return (
    <div className="space-y-6">
      <PageHeader
        title="Invitations"
        description="Invitations are tied to an email address, expire after 7 days and can be used once."
      />
      <Card>
        <CardHeader>
          <CardTitle>Invite someone</CardTitle>
          <CardDescription>
            They&apos;ll receive an email with a secure link to join {membership.organization.name}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InviteForm organizationId={membership.organizationId} />
        </CardContent>
      </Card>
      <section aria-labelledby="invitation-history">
        <h2 id="invitation-history" className="mb-3 text-base font-semibold">
          Invitation history
        </h2>
        {invitations.length === 0 ? (
          <EmptyState
            icon={<Mail />}
            title="No invitations yet"
            description="Invitations you send will be listed here."
          />
        ) : (
          <Card>
            <ul className="divide-border divide-y">
              {invitations.map((invitation) => {
                const revocable = invitation.status === "pending" && !invitation.isExpired;
                return (
                  <li
                    key={invitation.id}
                    className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{invitation.email}</p>
                      <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-2 text-xs">
                        {statusBadge(invitation)}
                        <span>{ROLE_LABELS[invitation.role]}</span>
                        <span aria-hidden="true">·</span>
                        <span>Sent {formatDateTime(invitation.created_at, viewer.profile.timezone)}</span>
                        {invitation.status === "pending" ? (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>
                              Expires {formatDateTime(invitation.expires_at, viewer.profile.timezone)}
                            </span>
                          </>
                        ) : null}
                      </div>
                    </div>
                    {revocable ? (
                      <RevokeInvitationButton invitationId={invitation.id} email={invitation.email} />
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </Card>
        )}
      </section>
    </div>
  );
}

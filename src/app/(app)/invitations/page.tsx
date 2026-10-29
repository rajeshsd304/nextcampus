import { MailOpen } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { ROLE_LABELS } from "@/features/access/roles";
import { requireViewer } from "@/features/auth/server/session";
import { InvitationResponse } from "@/features/invitations/components/invitation-response";
import { listMyInvitations } from "@/features/invitations/server/queries";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Invitations" };

export default async function MyInvitationsPage() {
  const viewer = await requireViewer({ returnTo: "/invitations" });
  const invitations = await listMyInvitations();

  return (
    <main id="main" className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Your invitations"
        description={`Pending invitations sent to ${viewer.user.email}.`}
      />
      {invitations.length === 0 ? (
        <EmptyState
          icon={<MailOpen />}
          title="No pending invitations"
          description="When an organization invites you, it will appear here. You can also create your own organization."
          action={
            <Link
              href="/onboarding/organization"
              className="text-primary font-semibold hover:underline dark:text-indigo-300"
            >
              Create an organization
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
                    <Badge tone="indigo">{ROLE_LABELS[invitation.role]}</Badge>
                    {invitation.invited_by_name ? <span>Invited by {invitation.invited_by_name}</span> : null}
                    <span aria-hidden="true">·</span>
                    <span>Expires {formatDateTime(invitation.expires_at, viewer.profile.timezone)}</span>
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

import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ROLE_LABELS } from "@/features/access/roles";
import { requireViewer } from "@/features/auth/server/session";
import { InvitationResponse } from "@/features/invitations/components/invitation-response";
import { listMyInvitations } from "@/features/invitations/server/queries";
import { CreateOrganizationForm } from "@/features/organizations/components/create-organization-form";

export const metadata: Metadata = { title: "Join or create an organization" };

export default async function OnboardingOrganizationPage() {
  const viewer = await requireViewer({ returnTo: "/onboarding/organization" });
  const invitations = await listMyInvitations();

  return (
    <div className="animate-fade-up space-y-6 pt-6">
      <div className="space-y-2">
        <p className="text-primary text-sm font-semibold dark:text-indigo-300">
          {viewer.memberships.length === 0 ? "Step 2 of 2" : "New workspace"}
        </p>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Choose your workspace</h1>
        <p className="text-muted-foreground">
          Students and staff usually join through an invitation from their institution. Instructors and
          administrators can create a new organization.
        </p>
      </div>

      {invitations.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>
              You have {invitations.length === 1 ? "an invitation" : `${invitations.length} invitations`}
            </CardTitle>
            <CardDescription>Sent to {viewer.user.email}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {invitations.map((invitation) => (
              <div key={invitation.invitation_id} className="border-border space-y-3 rounded-xl border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">{invitation.organization_name}</p>
                  <Badge tone="indigo">{ROLE_LABELS[invitation.role]}</Badge>
                </div>
                <InvitationResponse target={{ kind: "id", invitationId: invitation.invitation_id }} />
              </div>
            ))}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Waiting for an invitation?</CardTitle>
            <CardDescription>
              Ask your institution to invite <strong className="text-foreground">{viewer.user.email}</strong>.
              Invitations also appear in your{" "}
              <Link
                href="/invitations"
                className="text-primary font-medium hover:underline dark:text-indigo-300"
              >
                invitations inbox
              </Link>
              .
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Create a new organization</CardTitle>
          <CardDescription>You&apos;ll become its administrator and can invite others.</CardDescription>
        </CardHeader>
        <CardContent>
          <CreateOrganizationForm />
        </CardContent>
      </Card>
    </div>
  );
}

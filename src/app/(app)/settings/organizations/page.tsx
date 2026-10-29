import { Building2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { ROLE_LABELS } from "@/features/access/roles";
import { requireViewer } from "@/features/auth/server/session";
import { LeaveOrganizationButton } from "@/features/organizations/components/leave-organization-button";
import { ORGANIZATION_TYPE_LABELS } from "@/features/organizations/constants";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Organizations" };

export default async function OrganizationsSettingsPage() {
  const viewer = await requireViewer({ returnTo: "/settings/organizations" });

  return (
    <>
      <PageHeader
        title="Organizations"
        description="Workspaces you belong to and your role in each."
        actions={
          <Button asChild variant="secondary">
            <Link href="/onboarding/organization">Create organization</Link>
          </Button>
        }
      />
      {viewer.memberships.length === 0 ? (
        <EmptyState
          icon={<Building2 />}
          title="You're not in any organization"
          description="Accept an invitation or create your own organization to get started."
          action={
            <Button asChild>
              <Link href="/invitations">View invitations</Link>
            </Button>
          }
        />
      ) : (
        <Card>
          <ul className="divide-border divide-y">
            {viewer.memberships.map((m) => (
              <li
                key={m.organizationId}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
              >
                <div className="min-w-0">
                  <Link href={`/o/${m.organization.slug}`} className="font-semibold hover:underline">
                    {m.organization.name}
                  </Link>
                  <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-2 text-xs">
                    <Badge tone="indigo">{ROLE_LABELS[m.role]}</Badge>
                    <span>{ORGANIZATION_TYPE_LABELS[m.organization.type]}</span>
                    <span aria-hidden="true">·</span>
                    <span>Joined {formatDateTime(m.joinedAt, viewer.profile.timezone)}</span>
                    {m.organization.status !== "active" ? <Badge tone="warning">Suspended</Badge> : null}
                  </div>
                </div>
                <LeaveOrganizationButton
                  organizationId={m.organizationId}
                  organizationName={m.organization.name}
                />
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}

import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader, StatCard } from "@/components/ui/misc";
import { AuditList } from "@/features/audit/components/audit-list";
import { listRecentOrganizationAudit } from "@/features/audit/server/queries";
import { viewerDisplayName } from "@/features/auth/server/session";
import { listOrganizationInvitations } from "@/features/invitations/server/queries";
import { requireOrgArea } from "@/features/organizations/server/context";
import { countByRole, listMembers } from "@/features/organizations/server/queries";

export const metadata: Metadata = { title: "Administration" };

export default async function AdminOverviewPage({ params }: PageProps<"/o/[orgSlug]/admin">) {
  const { orgSlug } = await params;
  const { viewer, membership } = await requireOrgArea(orgSlug, "admin");
  const orgId = membership.organizationId;

  const [members, invitations, recentAudit] = await Promise.all([
    listMembers(orgId),
    listOrganizationInvitations(orgId),
    listRecentOrganizationAudit(orgId, 6),
  ]);
  const counts = countByRole(members);
  const pending = invitations.filter((i) => i.status === "pending" && !i.isExpired).length;
  const base = `/o/${orgSlug}/admin`;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={membership.organization.name}
        title={`Welcome back, ${viewerDisplayName(viewer).split(" ")[0]}`}
        description="Manage who has access to your organization and keep an eye on administrative activity."
        actions={
          <Button asChild>
            <Link href={`${base}/invitations`}>Invite people</Link>
          </Button>
        }
      />
      <section aria-label="Organization summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Students" value={counts.student} />
        <StatCard label="Instructors" value={counts.instructor} />
        <StatCard label="Invigilators & reviewers" value={counts.invigilator} />
        <StatCard
          label="Pending invitations"
          value={pending}
          hint={`${counts.org_admin} administrator${counts.org_admin === 1 ? "" : "s"}`}
        />
      </section>
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div className="space-y-1">
              <CardTitle>Recent activity</CardTitle>
              <CardDescription>The latest changes recorded in your audit log.</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href={`${base}/audit`}>
                View all <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <AuditList entries={recentAudit} timeZone={viewer.profile.timezone} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Get your organization ready</CardTitle>
            <CardDescription>Recommended next steps.</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3 text-sm">
              {[
                {
                  done: counts.instructor > 0,
                  label: "Invite at least one instructor",
                  href: `${base}/invitations`,
                },
                {
                  done: counts.student > 0,
                  label: "Invite your first students",
                  href: `${base}/invitations`,
                },
                {
                  done: counts.invigilator > 0,
                  label: "Add an invigilator or reviewer",
                  href: `${base}/invitations`,
                },
                {
                  done: counts.org_admin > 1,
                  label: "Add a second administrator for continuity",
                  href: `${base}/members`,
                },
              ].map((step) => (
                <li key={step.label} className="flex items-center justify-between gap-3">
                  <span className={step.done ? "text-muted-foreground line-through" : undefined}>
                    <span className="sr-only">{step.done ? "Completed: " : "To do: "}</span>
                    {step.label}
                  </span>
                  {!step.done ? (
                    <Link
                      href={step.href}
                      className="text-primary shrink-0 font-medium hover:underline dark:text-indigo-300"
                    >
                      Start
                    </Link>
                  ) : null}
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

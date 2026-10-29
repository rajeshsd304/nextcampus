import { ClipboardCheck } from "lucide-react";
import type { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, PageHeader, StatCard } from "@/components/ui/misc";
import { viewerDisplayName } from "@/features/auth/server/session";
import { RosterCard } from "@/features/dashboards/roster-card";
import { requireOrgArea } from "@/features/organizations/server/context";
import { countByRole, listMembers } from "@/features/organizations/server/queries";

export const metadata: Metadata = { title: "Review desk" };

export default async function ReviewerDashboard({ params }: PageProps<"/o/[orgSlug]/review">) {
  const { orgSlug } = await params;
  const { viewer, membership } = await requireOrgArea(orgSlug, "review");
  const members = await listMembers(membership.organizationId);
  const counts = countByRole(members);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={membership.organization.name}
        title={`Review desk · ${viewerDisplayName(viewer).split(" ")[0]}`}
        description="Monitor live sessions and review flagged attempts for integrity."
      />
      <section aria-label="Workspace summary" className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Candidates" value={counts.student} />
        <StatCard label="Instructors" value={counts.instructor} />
        <StatCard label="Fellow reviewers" value={Math.max(0, counts.invigilator - 1)} />
      </section>
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Review queue</CardTitle>
          </CardHeader>
          <CardContent>
            <EmptyState
              icon={<ClipboardCheck />}
              title="Nothing to review"
              description="Live sessions and flagged attempts will appear here once assessments are running."
            />
          </CardContent>
        </Card>
        <RosterCard
          title="Candidates"
          description="Students you may be asked to invigilate."
          members={members.filter((m) => m.role === "student")}
          emptyText="No students have joined this organization yet."
        />
      </div>
    </div>
  );
}

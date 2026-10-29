import { PenSquare } from "lucide-react";
import type { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, PageHeader, StatCard } from "@/components/ui/misc";
import { viewerDisplayName } from "@/features/auth/server/session";
import { RosterCard } from "@/features/dashboards/roster-card";
import { requireOrgArea } from "@/features/organizations/server/context";
import { countByRole, listMembers } from "@/features/organizations/server/queries";

export const metadata: Metadata = { title: "Instructor home" };

export default async function InstructorDashboard({ params }: PageProps<"/o/[orgSlug]/instructor">) {
  const { orgSlug } = await params;
  const { viewer, membership } = await requireOrgArea(orgSlug, "instructor");
  const members = await listMembers(membership.organizationId);
  const counts = countByRole(members);
  const students = members.filter((m) => m.role === "student");

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={membership.organization.name}
        title={`Hello, ${viewerDisplayName(viewer).split(" ")[0]}`}
        description="Your teaching workspace: the people you assess and the assessments you run."
      />
      <section aria-label="Workspace summary" className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Students" value={counts.student} />
        <StatCard label="Instructors" value={counts.instructor} />
        <StatCard label="Invigilators & reviewers" value={counts.invigilator} />
      </section>
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Assessments</CardTitle>
          </CardHeader>
          <CardContent>
            <EmptyState
              icon={<PenSquare />}
              title="No assessments yet"
              description="Assessment authoring is being rolled out to workspaces. Your roster below is ready for when it arrives."
            />
          </CardContent>
        </Card>
        <RosterCard
          title="Student roster"
          description={`${students.length} student${students.length === 1 ? "" : "s"} in ${membership.organization.name}.`}
          members={students}
          emptyText="Ask an organization administrator to invite students."
        />
      </div>
    </div>
  );
}

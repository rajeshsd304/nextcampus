import { PenSquare } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, PageHeader, StatCard } from "@/components/ui/misc";
import { viewerDisplayName } from "@/features/auth/server/session";
import { RosterCard } from "@/features/dashboards/roster-card";
import { organizationDisplayName } from "@/features/organizations/display";
import { requireOrgArea } from "@/features/organizations/server/context";
import { countByRole, listMembers } from "@/features/organizations/server/queries";
import { getFormatContext } from "@/features/preferences/server";
import { formatNumber } from "@/lib/i18n-format";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("dashboards.instructor");
  return { title: t("metaTitle") };
}

export default async function InstructorDashboard({ params }: PageProps<"/o/[orgSlug]/instructor">) {
  const { orgSlug } = await params;
  const { viewer, membership } = await requireOrgArea(orgSlug, "instructor");
  const isPublic = membership.organization.is_system;
  const [t, tOrgs, fmt, members] = await Promise.all([
    getTranslations("dashboards.instructor"),
    getTranslations("orgs"),
    getFormatContext(viewer.profile.timezone),
    isPublic ? Promise.resolve([]) : listMembers(membership.organizationId),
  ]);
  const counts = countByRole(members);
  const students = members.filter((m) => m.role === "student");
  const orgName = organizationDisplayName(membership.organization, tOrgs("publicName"));

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={orgName}
        title={t("title", { name: viewerDisplayName(viewer).split(" ")[0] ?? "" })}
        description={t("description")}
      />
      {!isPublic ? (
        <section aria-label={t("summaryLabel")} className="grid gap-4 sm:grid-cols-2">
          <StatCard label={t("students")} value={formatNumber(counts.student, fmt)} />
          <StatCard label={t("graders")} value={formatNumber(counts.instructor + counts.invigilator, fmt)} />
        </section>
      ) : null}
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("assessmentsTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <EmptyState
              icon={<PenSquare />}
              title={t("assessmentsEmptyTitle")}
              description={t("assessmentsEmptyBody")}
            />
          </CardContent>
        </Card>
        <RosterCard
          title={t("rosterTitle")}
          description={t("rosterDescription", {
            count: formatNumber(students.length, fmt),
            organization: orgName,
          })}
          members={students}
          emptyText={t("rosterEmpty")}
          privateRoster={isPublic}
        />
      </div>
    </div>
  );
}

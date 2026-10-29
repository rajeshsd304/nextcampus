import { ClipboardCheck } from "lucide-react";
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
  const t = await getTranslations("dashboards.review");
  return { title: t("metaTitle") };
}

export default async function ReviewerDashboard({ params }: PageProps<"/o/[orgSlug]/review">) {
  const { orgSlug } = await params;
  const { viewer, membership } = await requireOrgArea(orgSlug, "review");
  const isPublic = membership.organization.is_system;
  const [t, tOrgs, fmt, members] = await Promise.all([
    getTranslations("dashboards.review"),
    getTranslations("orgs"),
    getFormatContext(viewer.profile.timezone),
    isPublic ? Promise.resolve([]) : listMembers(membership.organizationId),
  ]);
  const counts = countByRole(members);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={organizationDisplayName(membership.organization, tOrgs("publicName"))}
        title={t("title", { name: viewerDisplayName(viewer).split(" ")[0] ?? "" })}
        description={t("description")}
      />
      {!isPublic ? (
        <section aria-label={t("summaryLabel")} className="grid gap-4 sm:grid-cols-2">
          <StatCard label={t("candidates")} value={formatNumber(counts.student, fmt)} />
          <StatCard label={t("graders")} value={formatNumber(counts.instructor + counts.invigilator, fmt)} />
        </section>
      ) : null}
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("queueTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <EmptyState
              icon={<ClipboardCheck />}
              title={t("queueEmptyTitle")}
              description={t("queueEmptyBody")}
            />
          </CardContent>
        </Card>
        <RosterCard
          title={t("rosterTitle")}
          description={t("rosterDescription")}
          members={members.filter((m) => m.role === "student")}
          emptyText={t("rosterEmpty")}
          privateRoster={isPublic}
        />
      </div>
    </div>
  );
}

import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader, StatCard } from "@/components/ui/misc";
import { AuditList } from "@/features/audit/components/audit-list";
import { listRecentOrganizationAudit } from "@/features/audit/server/queries";
import { viewerDisplayName } from "@/features/auth/server/session";
import { listOrganizationInvitations } from "@/features/invitations/server/queries";
import { organizationDisplayName } from "@/features/organizations/display";
import { requireOrgArea } from "@/features/organizations/server/context";
import { countByRole, listMembers } from "@/features/organizations/server/queries";
import { getFormatContext } from "@/features/preferences/server";
import { formatNumber } from "@/lib/i18n-format";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("adminDashboard");
  return { title: t("metaTitle") };
}

export default async function AdminOverviewPage({ params }: PageProps<"/o/[orgSlug]/admin">) {
  const { orgSlug } = await params;
  const { viewer, membership } = await requireOrgArea(orgSlug, "admin");
  const orgId = membership.organizationId;
  const [t, tOrgs, fmt, members, invitations, recentAudit] = await Promise.all([
    getTranslations("adminDashboard"),
    getTranslations("orgs"),
    getFormatContext(viewer.profile.timezone),
    listMembers(orgId),
    listOrganizationInvitations(orgId),
    listRecentOrganizationAudit(orgId, 6),
  ]);
  const counts = countByRole(members);
  const pending = invitations.filter((i) => i.status === "pending" && !i.isExpired).length;
  const base = `/o/${orgSlug}/admin`;
  const n = (value: number) => formatNumber(value, fmt);

  const steps = [
    {
      done: counts.instructor + counts.invigilator > 0,
      label: t("steps.grader"),
      href: `${base}/invitations`,
    },
    { done: counts.student > 0, label: t("steps.students"), href: `${base}/invitations` },
    { done: counts.org_admin > 1, label: t("steps.secondAdmin"), href: `${base}/members` },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={organizationDisplayName(membership.organization, tOrgs("publicName"))}
        title={t("welcome", { name: viewerDisplayName(viewer).split(" ")[0] ?? "" })}
        description={t("description")}
        actions={
          <Button asChild>
            <Link href={`${base}/invitations`}>{t("invite")}</Link>
          </Button>
        }
      />
      <section aria-label={t("summaryLabel")} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t("stats.students")} value={n(counts.student)} />
        <StatCard label={t("stats.graders")} value={n(counts.instructor + counts.invigilator)} />
        <StatCard label={t("stats.admins")} value={n(counts.org_admin)} />
        <StatCard label={t("stats.pending")} value={n(pending)} />
      </section>
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div className="space-y-1">
              <CardTitle>{t("activityTitle")}</CardTitle>
              <CardDescription>{t("activityDescription")}</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href={`${base}/audit`}>
                {t("viewAll")} <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <AuditList entries={recentAudit} format={fmt} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t("stepsTitle")}</CardTitle>
            <CardDescription>{t("stepsDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-1 text-sm">
              {steps.map((step) => (
                <li key={step.label} className="flex min-h-11 items-center justify-between gap-3">
                  <span className={step.done ? "text-muted-foreground line-through" : undefined}>
                    <span className="sr-only">{step.done ? t("stepDone") : t("stepTodo")}</span>
                    {step.label}
                  </span>
                  {!step.done ? (
                    <Link
                      href={step.href}
                      className="text-primary inline-flex min-h-11 shrink-0 items-center font-medium hover:underline dark:text-indigo-300"
                    >
                      {t("start")}
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

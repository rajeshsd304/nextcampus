import { CalendarClock, Library } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { ORG_ROLE_DISPLAY } from "@/features/access/roles";
import { viewerDisplayName } from "@/features/auth/server/session";
import { NotificationIcon } from "@/features/notifications/components/notification-icon";
import { NotificationText } from "@/features/notifications/notification-text";
import { getNotificationSummary } from "@/features/notifications/server/queries";
import { organizationDisplayName } from "@/features/organizations/display";
import { requireOrgArea } from "@/features/organizations/server/context";
import { getFormatContext } from "@/features/preferences/server";
import { formatDateTime, formatRelativeTime } from "@/lib/i18n-format";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("dashboards.student");
  return { title: t("metaTitle") };
}

export default async function StudentDashboard({ params }: PageProps<"/o/[orgSlug]/student">) {
  const { orgSlug } = await params;
  const { viewer, membership } = await requireOrgArea(orgSlug, "student");
  const [t, tRoles, tOrgs, tTypes, fmt, { recent }] = await Promise.all([
    getTranslations("dashboards.student"),
    getTranslations("roles"),
    getTranslations("orgs"),
    getTranslations("orgForms.types"),
    getFormatContext(viewer.profile.timezone),
    getNotificationSummary(5),
  ]);
  const { organization } = membership;
  const isPublic = organization.is_system;
  const orgName = organizationDisplayName(organization, tOrgs("publicName"));

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={orgName}
        title={t("title", { name: viewerDisplayName(viewer).split(" ")[0] ?? "" })}
        description={isPublic ? t("descriptionPublic") : t("description")}
      />
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("upcomingTitle")}</CardTitle>
              <CardDescription>
                {t("timezoneNote", { timezone: viewer.profile.timezone.replaceAll("_", " ") })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EmptyState
                icon={<CalendarClock />}
                title={t("upcomingEmptyTitle")}
                description={isPublic ? t("upcomingEmptyPublic") : t("upcomingEmptyInstitution")}
              />
            </CardContent>
          </Card>
          {isPublic ? (
            <Card>
              <CardHeader className="flex flex-row items-start gap-4">
                <div className="bg-accent text-accent-foreground flex size-11 shrink-0 items-center justify-center rounded-xl">
                  <Library className="size-5" aria-hidden="true" />
                </div>
                <div className="space-y-1">
                  <CardTitle>{t("catalogTitle")}</CardTitle>
                  <CardDescription>{t("catalogBody")}</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <Button asChild variant="secondary">
                  <Link href="/exams">{t("catalogCta")}</Link>
                </Button>
              </CardContent>
            </Card>
          ) : null}
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("enrollmentTitle")}</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">{t("organization")}</dt>
                  <dd className="text-right font-medium">{orgName}</dd>
                </div>
                {!isPublic ? (
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">{t("type")}</dt>
                    <dd className="text-right">{tTypes(organization.type)}</dd>
                  </div>
                ) : null}
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">{t("role")}</dt>
                  <dd>
                    <Badge tone="indigo">{tRoles(`${ORG_ROLE_DISPLAY[membership.role]}.label`)}</Badge>
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">{t("joined")}</dt>
                  <dd className="text-right">{formatDateTime(membership.joinedAt, fmt)}</dd>
                </div>
              </dl>
              {isPublic ? <p className="text-muted-foreground mt-4 text-xs">{t("privacyNote")}</p> : null}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{t("announcementsTitle")}</CardTitle>
              <Link
                href="/notifications"
                className="text-primary inline-flex min-h-11 items-center text-sm font-medium hover:underline dark:text-indigo-300"
              >
                {t("viewAll")}
              </Link>
            </CardHeader>
            <CardContent>
              {recent.length === 0 ? (
                <p className="text-muted-foreground text-sm">{t("announcementsEmpty")}</p>
              ) : (
                <ul className="space-y-3">
                  {recent.map((item) => (
                    <li key={item.id} className="flex gap-3">
                      <NotificationIcon kind={item.kind} />
                      <div className="min-w-0">
                        <p className={item.read_at ? "text-sm" : "text-sm font-semibold"}>
                          <NotificationText item={item} part="title" />
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {formatRelativeTime(item.created_at, fmt)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

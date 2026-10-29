import { CalendarClock } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { ROLE_LABELS } from "@/features/access/roles";
import { viewerDisplayName } from "@/features/auth/server/session";
import { NotificationIcon } from "@/features/notifications/components/notification-icon";
import { getNotificationSummary } from "@/features/notifications/server/queries";
import { ORGANIZATION_TYPE_LABELS } from "@/features/organizations/constants";
import { requireOrgArea } from "@/features/organizations/server/context";
import { formatDateTime, formatRelativeTime } from "@/lib/utils";

export const metadata: Metadata = { title: "My assessments" };

export default async function StudentDashboard({ params }: PageProps<"/o/[orgSlug]/student">) {
  const { orgSlug } = await params;
  const { viewer, membership } = await requireOrgArea(orgSlug, "student");
  const { recent } = await getNotificationSummary(5);
  const { organization } = membership;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={organization.name}
        title={`Hi, ${viewerDisplayName(viewer).split(" ")[0]}`}
        description="Your upcoming assessments, results and announcements in one place."
      />
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Upcoming assessments</CardTitle>
            <CardDescription>
              Shown in your time zone: {viewer.profile.timezone.replaceAll("_", " ")}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EmptyState
              icon={<CalendarClock />}
              title="Nothing scheduled"
              description="When your instructors publish an assessment for you, it will appear here with its window and rules."
            />
          </CardContent>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Your enrollment</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Organization</dt>
                  <dd className="text-right font-medium">{organization.name}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Type</dt>
                  <dd className="text-right">{ORGANIZATION_TYPE_LABELS[organization.type]}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Role</dt>
                  <dd>
                    <Badge tone="indigo">{ROLE_LABELS[membership.role]}</Badge>
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Joined</dt>
                  <dd className="text-right">
                    {formatDateTime(membership.joinedAt, viewer.profile.timezone)}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Announcements</CardTitle>
              <Link
                href="/notifications"
                className="text-primary text-sm font-medium hover:underline dark:text-indigo-300"
              >
                View all
              </Link>
            </CardHeader>
            <CardContent>
              {recent.length === 0 ? (
                <p className="text-muted-foreground text-sm">No announcements yet.</p>
              ) : (
                <ul className="space-y-3">
                  {recent.map((item) => (
                    <li key={item.id} className="flex gap-3">
                      <NotificationIcon kind={item.kind} />
                      <div className="min-w-0">
                        <p className={item.read_at ? "text-sm" : "text-sm font-semibold"}>{item.title}</p>
                        <p className="text-muted-foreground text-xs">{formatRelativeTime(item.created_at)}</p>
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

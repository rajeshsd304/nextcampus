import { Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { ORG_ROLE_DISPLAY } from "@/features/access/roles";
import { MemberControls } from "@/features/organizations/components/member-controls";
import { requireOrgPermission } from "@/features/organizations/server/context";
import { listMembers } from "@/features/organizations/server/queries";
import { getFormatContext } from "@/features/preferences/server";
import { formatDateTime } from "@/lib/i18n-format";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("membersPage");
  return { title: t("title") };
}

export default async function MembersPage({ params }: PageProps<"/o/[orgSlug]/admin/members">) {
  const { orgSlug } = await params;
  const { viewer, membership } = await requireOrgPermission(orgSlug, "members.manage");
  const [t, tRoles, fmt, members] = await Promise.all([
    getTranslations("membersPage"),
    getTranslations("roles"),
    getFormatContext(viewer.profile.timezone),
    listMembers(membership.organizationId),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <Button asChild>
            <Link href={`/o/${orgSlug}/admin/invitations`}>{t("invite")}</Link>
          </Button>
        }
      />
      {members.length === 0 ? (
        <EmptyState icon={<Users />} title={t("emptyTitle")} description={t("emptyDescription")} />
      ) : (
        <Card>
          <ul className="divide-border divide-y">
            {members.map((member) => {
              const name =
                member.profile?.display_name ??
                member.profile?.full_name ??
                member.profile?.email ??
                t("unknown");
              return (
                <li
                  key={member.userId}
                  className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar name={name} src={member.profile?.avatar_url ?? null} />
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {name}
                        {member.userId === viewer.user.id ? (
                          <span className="text-muted-foreground">{` ${t("you")}`}</span>
                        ) : null}
                      </p>
                      <p className="text-muted-foreground truncate text-sm">{member.profile?.email}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <Badge tone="indigo">{tRoles(`${ORG_ROLE_DISPLAY[member.role]}.label`)}</Badge>
                        {member.status !== "active" ? <Badge tone="warning">{t("suspended")}</Badge> : null}
                        <span className="text-muted-foreground text-xs">
                          {t("joined", { date: formatDateTime(member.joinedAt, fmt) })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <MemberControls
                    organizationId={membership.organizationId}
                    userId={member.userId}
                    role={member.role}
                    memberName={name}
                    isSelf={member.userId === viewer.user.id}
                  />
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}

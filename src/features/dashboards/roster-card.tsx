import { Lock, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/misc";
import type { MemberRow } from "@/features/organizations/server/queries";

export function RosterCard({
  title,
  description,
  members,
  emptyText,
  privateRoster = false,
}: {
  title: string;
  description: string;
  members: MemberRow[];
  emptyText: string;
  /** System (public) organizations never expose rosters. */
  privateRoster?: boolean;
}) {
  const t = useTranslations("dashboards.roster");
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {privateRoster ? (
          <EmptyState icon={<Lock />} title={t("privateTitle")} description={t("privateBody")} />
        ) : members.length === 0 ? (
          <EmptyState icon={<Users />} title={t("emptyTitle")} description={emptyText} />
        ) : (
          <ul className="divide-border divide-y">
            {members.map((member) => {
              const name =
                member.profile?.display_name ??
                member.profile?.full_name ??
                member.profile?.email ??
                t("unknown");
              return (
                <li key={member.userId} className="flex items-center gap-3 py-3">
                  <Avatar name={name} src={member.profile?.avatar_url ?? null} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{name}</p>
                    <p className="text-muted-foreground truncate text-xs">{member.profile?.email}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

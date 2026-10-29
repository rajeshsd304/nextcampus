import { Users } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/misc";
import type { MemberRow } from "@/features/organizations/server/queries";

export function RosterCard({
  title,
  description,
  members,
  emptyText,
}: {
  title: string;
  description: string;
  members: MemberRow[];
  emptyText: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {members.length === 0 ? (
          <EmptyState icon={<Users />} title="Nobody here yet" description={emptyText} />
        ) : (
          <ul className="divide-border divide-y">
            {members.map((member) => {
              const name =
                member.profile?.display_name ??
                member.profile?.full_name ??
                member.profile?.email ??
                "Unknown user";
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

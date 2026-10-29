import {
  ClipboardCheck,
  GraduationCap,
  History,
  LayoutDashboard,
  Mail,
  PenSquare,
  Settings,
  Users,
} from "lucide-react";
import { SideNav, type SideNavItem } from "@/components/app-shell/side-nav";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ROLE_LABELS } from "@/features/access/roles";
import { ORGANIZATION_TYPE_LABELS } from "@/features/organizations/constants";
import { getOrgContext, isMembershipUsable } from "@/features/organizations/server/context";

function navFor(slug: string, role: keyof typeof ROLE_LABELS): SideNavItem[] {
  const base = `/o/${slug}`;
  switch (role) {
    case "org_admin":
      return [
        { href: `${base}/admin`, label: "Overview", icon: <LayoutDashboard />, exact: true },
        { href: `${base}/admin/members`, label: "Members", icon: <Users /> },
        { href: `${base}/admin/invitations`, label: "Invitations", icon: <Mail /> },
        { href: `${base}/admin/audit`, label: "Audit log", icon: <History /> },
        { href: `${base}/admin/settings`, label: "Settings", icon: <Settings /> },
      ];
    case "instructor":
      return [{ href: `${base}/instructor`, label: "Instructor home", icon: <PenSquare /> }];
    case "invigilator":
      return [{ href: `${base}/review`, label: "Review desk", icon: <ClipboardCheck /> }];
    case "student":
      return [{ href: `${base}/student`, label: "My assessments", icon: <GraduationCap /> }];
  }
}

export default async function OrganizationLayout({ children, params }: LayoutProps<"/o/[orgSlug]">) {
  const { orgSlug } = await params;
  const { membership } = await getOrgContext(orgSlug);
  const { organization } = membership;

  if (!isMembershipUsable(membership)) {
    return (
      <main id="main" className="mx-auto max-w-2xl py-12">
        <Alert tone="warning" title={`${organization.name} is unavailable`}>
          {organization.status !== "active"
            ? "This organization has been suspended by NextCampus. Contact your administrator for details."
            : "Your membership in this organization is suspended. Contact an organization administrator."}
        </Alert>
      </main>
    );
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:gap-10">
      <SideNav
        label={`${organization.name} navigation`}
        items={navFor(organization.slug, membership.role)}
        header={
          <div className="border-border bg-surface rounded-2xl border p-4">
            <p className="truncate font-semibold">{organization.name}</p>
            <p className="text-muted-foreground text-xs">{ORGANIZATION_TYPE_LABELS[organization.type]}</p>
            <Badge tone="indigo" className="mt-3">
              {ROLE_LABELS[membership.role]}
            </Badge>
          </div>
        }
      />
      <main id="main" className="min-w-0 flex-1">
        {children}
      </main>
    </div>
  );
}

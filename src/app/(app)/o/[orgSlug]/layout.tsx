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
import { getTranslations } from "next-intl/server";
import { SideNav, type SideNavItem } from "@/components/app-shell/side-nav";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ORG_ROLE_DISPLAY, type OrgRole } from "@/features/access/roles";
import { organizationDisplayName } from "@/features/organizations/display";
import { getOrgContext, isMembershipUsable } from "@/features/organizations/server/context";

export default async function OrganizationLayout({ children, params }: LayoutProps<"/o/[orgSlug]">) {
  const { orgSlug } = await params;
  const { membership } = await getOrgContext(orgSlug);
  const { organization } = membership;
  const [t, tRoles, tOrgs, tTypes] = await Promise.all([
    getTranslations("shell.orgNav"),
    getTranslations("roles"),
    getTranslations("orgs"),
    getTranslations("orgForms.types"),
  ]);
  const name = organizationDisplayName(organization, tOrgs("publicName"));

  const navFor = (role: OrgRole): SideNavItem[] => {
    const base = `/o/${organization.slug}`;
    switch (role) {
      case "org_admin":
        return [
          { href: `${base}/admin`, label: t("overview"), icon: <LayoutDashboard />, exact: true },
          { href: `${base}/admin/members`, label: t("members"), icon: <Users /> },
          { href: `${base}/admin/invitations`, label: t("invitations"), icon: <Mail /> },
          { href: `${base}/admin/audit`, label: t("audit"), icon: <History /> },
          { href: `${base}/admin/settings`, label: t("settings"), icon: <Settings /> },
        ];
      case "instructor":
        return [{ href: `${base}/instructor`, label: t("instructorHome"), icon: <PenSquare /> }];
      case "invigilator":
        return [{ href: `${base}/review`, label: t("reviewDesk"), icon: <ClipboardCheck /> }];
      case "student":
        return [{ href: `${base}/student`, label: t("studentHome"), icon: <GraduationCap /> }];
    }
  };

  if (!isMembershipUsable(membership)) {
    return (
      <main id="main" className="mx-auto max-w-2xl py-12">
        <Alert tone="warning" title={t("unavailableTitle", { name })}>
          {organization.status !== "active" ? t("orgSuspended") : t("membershipSuspended")}
        </Alert>
      </main>
    );
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:gap-10">
      <SideNav
        label={t("label", { name })}
        items={navFor(membership.role)}
        header={
          <div className="border-border bg-surface rounded-2xl border p-4">
            <p className="truncate font-semibold">{name}</p>
            <p className="text-muted-foreground text-xs">
              {organization.is_system ? tOrgs("publicDescription") : tTypes(organization.type)}
            </p>
            <Badge tone="indigo" className="mt-3">
              {tRoles(`${ORG_ROLE_DISPLAY[membership.role]}.label`)}
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

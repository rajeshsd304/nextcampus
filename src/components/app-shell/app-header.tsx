import { getTranslations } from "next-intl/server";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { Logo } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { ORG_ROLE_DISPLAY } from "@/features/access/roles";
import { viewerDisplayName, type Viewer } from "@/features/auth/server/session";
import { NotificationBell } from "@/features/notifications/components/notification-bell";
import { getNotificationSummary } from "@/features/notifications/server/queries";
import { organizationDisplayName } from "@/features/organizations/display";
import { getFormatContext } from "@/features/preferences/server";
import { OrgSwitcher } from "./org-switcher";
import { UserMenu } from "./user-menu";

export async function AppHeader({ viewer }: { viewer: Viewer }) {
  const [notifications, t, fmt] = await Promise.all([
    getNotificationSummary(),
    getTranslations("orgs"),
    getFormatContext(viewer.profile.timezone),
  ]);
  const workspaces = viewer.memberships.map((m) => ({
    slug: m.organization.slug,
    name: organizationDisplayName(m.organization, t("publicName")),
    displayRole: ORG_ROLE_DISPLAY[m.role],
    isPublic: m.organization.is_system,
    suspended: m.status !== "active" || m.organization.status !== "active",
  }));

  return (
    <header className="border-border bg-background/85 sticky top-0 z-40 border-b backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-[90rem] items-center justify-between gap-2 px-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-2 sm:gap-5">
          <Logo href="/dashboard" className="shrink-0 [&>span]:hidden sm:[&>span]:inline" />
          <span className="bg-border hidden h-6 w-px sm:block" aria-hidden="true" />
          <OrgSwitcher workspaces={workspaces} />
        </div>
        <div className="flex shrink-0 items-center">
          <LocaleSwitcher compact className="hidden md:inline-flex" />
          <ThemeToggle />
          <NotificationBell
            unreadCount={notifications.unreadCount}
            recent={notifications.recent}
            format={fmt}
          />
          <UserMenu
            name={viewerDisplayName(viewer)}
            email={viewer.user.email}
            avatarUrl={viewer.profile.avatar_url}
            isSuperAdmin={viewer.isSuperAdmin}
          />
        </div>
      </div>
    </header>
  );
}

import { Logo } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { viewerDisplayName, type Viewer } from "@/features/auth/server/session";
import { NotificationBell } from "@/features/notifications/components/notification-bell";
import { getNotificationSummary } from "@/features/notifications/server/queries";
import { OrgSwitcher } from "./org-switcher";
import { UserMenu } from "./user-menu";

export async function AppHeader({ viewer }: { viewer: Viewer }) {
  const notifications = await getNotificationSummary();
  const workspaces = viewer.memberships.map((m) => ({
    slug: m.organization.slug,
    name: m.organization.name,
    role: m.role,
    suspended: m.status !== "active" || m.organization.status !== "active",
  }));

  return (
    <header className="border-border bg-background/85 sticky top-0 z-40 border-b backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-[90rem] items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3 sm:gap-5">
          <Logo href="/dashboard" className="[&>span]:hidden sm:[&>span]:inline" />
          <span className="bg-border hidden h-6 w-px sm:block" aria-hidden="true" />
          <OrgSwitcher workspaces={workspaces} />
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <NotificationBell unreadCount={notifications.unreadCount} recent={notifications.recent} />
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

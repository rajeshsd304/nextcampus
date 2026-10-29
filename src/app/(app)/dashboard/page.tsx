import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ROLE_HOME_AREA } from "@/features/access/roles";
import { requireViewer } from "@/features/auth/server/session";
import { isMembershipUsable } from "@/features/organizations/server/context";
import { LAST_ORG_COOKIE } from "@/lib/supabase/proxy";

/**
 * Post-sign-in router: sends the user to the dashboard their role allows in
 * their most recently used workspace. Without a preference, an institution
 * workspace wins over the public practice organization.
 */
export default async function DashboardRouter() {
  const viewer = await requireViewer();
  const usable = viewer.memberships.filter(isMembershipUsable);

  if (usable.length === 0) {
    if (viewer.isSuperAdmin) redirect("/platform");
    redirect("/onboarding/organization");
  }

  const lastSlug = (await cookies()).get(LAST_ORG_COOKIE)?.value;
  const target =
    usable.find((m) => m.organization.slug === lastSlug) ??
    usable.find((m) => !m.organization.is_system) ??
    usable[0];
  if (!target) redirect("/onboarding/organization");
  redirect(`/o/${target.organization.slug}/${ROLE_HOME_AREA[target.role]}`);
}

import "server-only";
import { forbidden, notFound } from "next/navigation";
import { cache } from "react";
import { canAccessArea, roleHasPermission, type Permission } from "@/features/access/permissions";
import type { DashboardArea } from "@/features/access/roles";
import { requireViewer, type Membership, type Viewer } from "@/features/auth/server/session";

export type OrgContext = { viewer: Viewer; membership: Membership };

/**
 * Resolves the caller's membership for an organization slug. Non-members get
 * a 404 so the existence of other tenants is not revealed.
 */
export const getOrgContext = cache(async (slug: string): Promise<OrgContext> => {
  const viewer = await requireViewer({ returnTo: `/o/${slug}` });
  const membership = viewer.memberships.find((m) => m.organization.slug === slug);
  if (!membership) notFound();
  return { viewer, membership };
});

export function isMembershipUsable(membership: Membership): boolean {
  return membership.status === "active" && membership.organization.status === "active";
}

/** Server guard for an organization dashboard area. */
export async function requireOrgArea(slug: string, area: DashboardArea): Promise<OrgContext> {
  const context = await getOrgContext(slug);
  if (!isMembershipUsable(context.membership) || !canAccessArea(context.membership.role, area)) forbidden();
  return context;
}

/** Server guard for a specific permission inside an organization. */
export async function requireOrgPermission(slug: string, permission: Permission): Promise<OrgContext> {
  const context = await getOrgContext(slug);
  if (!isMembershipUsable(context.membership) || !roleHasPermission(context.membership.role, permission))
    forbidden();
  return context;
}

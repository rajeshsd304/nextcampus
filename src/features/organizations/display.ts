import type { MembershipOrganization } from "@/features/auth/server/session";

/**
 * System organizations have a translated display name (messages
 * `orgs.publicName`); tenant organizations show their own name.
 */
export function organizationDisplayName(
  organization: Pick<MembershipOrganization, "name" | "is_system">,
  publicName: string,
): string {
  return organization.is_system ? publicName : organization.name;
}

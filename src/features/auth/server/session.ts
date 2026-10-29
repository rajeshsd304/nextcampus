import "server-only";
import type { User } from "@supabase/supabase-js";
import { forbidden, redirect } from "next/navigation";
import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Enums, Tables } from "@/types/database";

export type Profile = Tables<"profiles">;

export type MembershipOrganization = Pick<
  Tables<"organizations">,
  "id" | "name" | "slug" | "type" | "status"
>;

export type Membership = {
  organizationId: string;
  role: Enums<"org_role">;
  status: Enums<"membership_status">;
  joinedAt: string;
  organization: MembershipOrganization;
};

export type Viewer = {
  user: { id: string; email: string; providers: string[]; emailConfirmed: boolean };
  profile: Profile;
  memberships: Membership[];
  isSuperAdmin: boolean;
};

/** Authenticated user, verified against Supabase Auth (not just the cookie). */
export const getAuthUser = cache(async (): Promise<User | null> => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
});

export const getViewer = cache(async (): Promise<Viewer | null> => {
  const user = await getAuthUser();
  if (!user) return null;

  const supabase = await createSupabaseServerClient();
  const [profileRes, membershipsRes, adminRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase
      .from("organization_members")
      .select("organization_id, role, status, joined_at, organizations(id, name, slug, type, status)")
      .eq("user_id", user.id)
      .order("joined_at", { ascending: true }),
    supabase.from("platform_admins").select("user_id").eq("user_id", user.id).maybeSingle(),
  ]);

  if (profileRes.error) throw new Error(`Failed to load profile: ${profileRes.error.message}`);
  if (membershipsRes.error) throw new Error(`Failed to load memberships: ${membershipsRes.error.message}`);
  if (adminRes.error) throw new Error(`Failed to load platform role: ${adminRes.error.message}`);
  if (!profileRes.data) throw new Error("Profile missing for authenticated user");

  const memberships: Membership[] = [];
  for (const row of membershipsRes.data) {
    if (!row.organizations) continue;
    memberships.push({
      organizationId: row.organization_id,
      role: row.role,
      status: row.status,
      joinedAt: row.joined_at,
      organization: row.organizations,
    });
  }

  const providers = Array.isArray(user.app_metadata.providers)
    ? user.app_metadata.providers.filter((p): p is string => typeof p === "string")
    : typeof user.app_metadata.provider === "string"
      ? [user.app_metadata.provider]
      : [];

  return {
    user: {
      id: user.id,
      email: user.email ?? profileRes.data.email,
      providers,
      emailConfirmed: Boolean(user.email_confirmed_at),
    },
    profile: profileRes.data,
    memberships,
    isSuperAdmin: Boolean(adminRes.data),
  };
});

/**
 * Server-side guard for authenticated pages. Redirects to sign-in when there
 * is no session and to onboarding until the profile is complete.
 */
export async function requireViewer(
  options: { allowIncompleteProfile?: boolean; returnTo?: string } = {},
): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) {
    redirect(`/sign-in?next=${encodeURIComponent(options.returnTo ?? "/dashboard")}`);
  }
  if (!options.allowIncompleteProfile && !viewer.profile.onboarded_at) {
    redirect(options.returnTo ? `/onboarding?next=${encodeURIComponent(options.returnTo)}` : "/onboarding");
  }
  return viewer;
}

export async function requireSuperAdmin(): Promise<Viewer> {
  const viewer = await requireViewer({ returnTo: "/platform" });
  if (!viewer.isSuperAdmin) forbidden();
  return viewer;
}

export function viewerDisplayName(viewer: Pick<Viewer, "profile">): string {
  return viewer.profile.display_name ?? viewer.profile.full_name ?? viewer.profile.email;
}

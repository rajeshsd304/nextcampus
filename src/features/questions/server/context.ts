import "server-only";
import { forbidden, notFound } from "next/navigation";
import { z } from "zod";
import { roleHasPermission } from "@/features/access/permissions";
import { getViewer, type Viewer } from "@/features/auth/server/session";
import { isMembershipUsable } from "@/features/organizations/server/context";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Which bank a page or action operates on. Serializable (sent from the client). */
export const bankRefSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("org"), slug: z.string().regex(/^[a-z0-9-]{3,48}$/) }),
  z.object({ kind: z.literal("platform") }),
]);
export type BankRef = z.infer<typeof bankRefSchema>;

export type BankContext = {
  ref: BankRef;
  viewer: Viewer;
  orgId: string;
  /** Questions owned by the system organization form the public bank. */
  isPublicBank: boolean;
  basePath: string;
  canAuthor: boolean;
  /** Approve/reject/publish/archive. Public bank: platform admins only. */
  canReview: boolean;
};

/**
 * Resolves the caller's capabilities for a bank. Mirrors the database rules
 * (private.can_author_in / can_review_in) for UI purposes; the RPCs and RLS
 * remain the enforcement point. Returns null when the caller has no access.
 */
export async function resolveBank(ref: BankRef): Promise<BankContext | null> {
  const viewer = await getViewer();
  if (!viewer?.profile.onboarded_at || !viewer.user.emailConfirmed) return null;

  if (ref.kind === "platform") {
    if (!viewer.isSuperAdmin) return null;
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from("organizations")
      .select("id")
      .eq("is_system", true)
      .limit(1)
      .maybeSingle();
    if (!data) return null;
    return {
      ref,
      viewer,
      orgId: data.id,
      isPublicBank: true,
      basePath: "/platform/questions",
      canAuthor: true,
      canReview: true,
    };
  }

  const membership = viewer.memberships.find((m) => m.organization.slug === ref.slug);
  if (!membership || !isMembershipUsable(membership) || !roleHasPermission(membership.role, "questions.read"))
    return null;
  const isPublicBank = membership.organization.is_system;
  return {
    ref,
    viewer,
    orgId: membership.organizationId,
    isPublicBank,
    basePath: `/o/${ref.slug}/questions`,
    canAuthor: roleHasPermission(membership.role, "questions.author"),
    canReview: !isPublicBank && roleHasPermission(membership.role, "questions.review"),
  };
}

/** Page guard: 404 for non-members (no tenant leak), 403 for members without access. */
export async function requireBank(ref: BankRef): Promise<BankContext> {
  const context = await resolveBank(ref);
  if (context) return context;
  if (ref.kind === "org") {
    const viewer = await getViewer();
    if (!viewer?.memberships.some((m) => m.organization.slug === ref.slug)) notFound();
  }
  forbidden();
}

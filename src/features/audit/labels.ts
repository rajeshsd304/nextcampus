const ACTION_LABELS: Record<string, string> = {
  "auth.sign_up": "Account created",
  "auth.sign_in": "Signed in",
  "auth.sign_out": "Signed out",
  "auth.password_changed": "Password changed",
  "auth.email_verified": "Email verified",
  "profile.onboarded": "Profile completed",
  "organization.created": "Organization created",
  "organization.updated": "Organization updated",
  "invitation.created": "Invitation sent",
  "invitation.revoked": "Invitation revoked",
  "invitation.accepted": "Invitation accepted",
  "invitation.declined": "Invitation declined",
  "member.role_changed": "Member role changed",
  "member.removed": "Member removed",
  "member.left": "Member left",
};

export function auditActionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action;
}

type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

/** Short human-readable summary of audit metadata. */
export function auditMetadataSummary(action: string, metadata: Json): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const get = (key: string): string | null => {
    const value = metadata[key];
    return typeof value === "string" ? value : null;
  };
  const role = (value: string | null) => (value ? value.replace("_", " ") : null);

  switch (action) {
    case "invitation.created":
    case "invitation.accepted":
      return [get("email"), role(get("role"))].filter(Boolean).join(" · ") || null;
    case "invitation.revoked":
    case "invitation.declined":
      return get("email");
    case "member.role_changed":
      return `${role(get("from"))} → ${role(get("to"))}`;
    case "member.removed":
    case "member.left":
      return role(get("role"));
    case "organization.created":
      return get("name");
    case "organization.updated": {
      const changes = metadata.changes;
      return changes && typeof changes === "object" && !Array.isArray(changes)
        ? `Changed ${Object.keys(changes).join(", ")}`
        : null;
    }
    case "auth.sign_in":
    case "auth.sign_up":
      return get("method") ?? get("provider");
    default:
      return null;
  }
}

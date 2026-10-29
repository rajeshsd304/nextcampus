import en from "../../../messages/en.json";

type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

/** Looks up a dotted audit action (e.g. `member.role_changed`) in a nested label map. */
export function lookupAuditLabel(labels: unknown, action: string): string | null {
  let node: unknown = labels;
  for (const part of action.split(".")) {
    if (!node || typeof node !== "object") return null;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === "string" ? node : null;
}

/** English label (fallback for logs and contexts without a translator). */
export function auditActionLabel(action: string): string {
  return lookupAuditLabel(en.audit.actions, action) ?? action;
}

function objectOf(metadata: Json): Record<string, Json | undefined> | null {
  return metadata && typeof metadata === "object" && !Array.isArray(metadata) ? metadata : null;
}

export type AuditSummaryParts =
  | { kind: "text"; value: string }
  | { kind: "role"; value: string }
  | { kind: "roleChange"; from: string; to: string }
  | { kind: "emailRole"; email: string | null; role: string | null }
  | { kind: "changedFields"; fields: string[] }
  | null;

/** Structured summary of audit metadata; rendered (and translated) by the UI. */
export function auditMetadataParts(action: string, metadata: Json): AuditSummaryParts {
  const meta = objectOf(metadata);
  if (!meta) return null;
  const get = (key: string): string | null => {
    const value = meta[key];
    return typeof value === "string" ? value : null;
  };

  switch (action) {
    case "invitation.created":
    case "invitation.accepted": {
      const email = get("email");
      const role = get("role");
      return email || role ? { kind: "emailRole", email, role } : null;
    }
    case "invitation.revoked":
    case "invitation.declined": {
      const email = get("email");
      return email ? { kind: "text", value: email } : null;
    }
    case "member.role_changed": {
      const from = get("from");
      const to = get("to");
      return from && to ? { kind: "roleChange", from, to } : null;
    }
    case "member.removed":
    case "member.left":
    case "member.auto_enrolled":
    case "member.joined_public": {
      const role = get("role");
      return role ? { kind: "role", value: role } : null;
    }
    case "organization.created": {
      const name = get("name");
      return name ? { kind: "text", value: name } : null;
    }
    case "organization.updated": {
      const changes = objectOf(meta.changes ?? null);
      return changes ? { kind: "changedFields", fields: Object.keys(changes) } : null;
    }
    case "auth.sign_in":
    case "auth.sign_up": {
      const method = get("method") ?? get("provider");
      return method ? { kind: "text", value: method } : null;
    }
    default: {
      if (/^(university|university_category|subject|exam_target)\./.test(action)) {
        const name = get("name_en") ?? get("slug");
        return name ? { kind: "text", value: name } : null;
      }
      return null;
    }
  }
}

/** English one-line summary (fallback for logs and tests). */
export function auditMetadataSummary(action: string, metadata: Json): string | null {
  const parts = auditMetadataParts(action, metadata);
  const role = (value: string | null) => (value ? value.replace("_", " ") : null);
  if (!parts) return null;
  switch (parts.kind) {
    case "text":
      return parts.value;
    case "role":
      return role(parts.value);
    case "roleChange":
      return `${role(parts.from)} → ${role(parts.to)}`;
    case "emailRole":
      return [parts.email, role(parts.role)].filter(Boolean).join(" · ") || null;
    case "changedFields":
      return `Changed ${parts.fields.join(", ")}`;
  }
}

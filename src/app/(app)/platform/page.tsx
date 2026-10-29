import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader, StatCard } from "@/components/ui/misc";
import { AuditList } from "@/features/audit/components/audit-list";
import { listPlatformAudit } from "@/features/audit/server/queries";
import { requireSuperAdmin } from "@/features/auth/server/session";
import { ORGANIZATION_TYPE_LABELS } from "@/features/organizations/constants";
import { OrganizationStatusToggle } from "@/features/organizations/components/organization-status-toggle";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Platform console" };

export default async function PlatformConsolePage() {
  const viewer = await requireSuperAdmin();
  const supabase = await createSupabaseServerClient();

  // Super-admin visibility is granted by RLS (private.is_super_admin()).
  const [orgsRes, usersRes, contactRes, audit] = await Promise.all([
    supabase
      .from("organizations")
      .select("id, name, slug, type, status, created_at, organization_members(count)")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase
      .from("contact_requests")
      .select("id, name, email, organization, topic, message, created_at")
      .order("created_at", { ascending: false })
      .limit(10),
    listPlatformAudit(12),
  ]);
  if (orgsRes.error) throw new Error(orgsRes.error.message);
  if (usersRes.error) throw new Error(usersRes.error.message);
  if (contactRes.error) throw new Error(contactRes.error.message);

  const organizations = orgsRes.data;
  const tz = viewer.profile.timezone;

  return (
    <main id="main" className="space-y-8">
      <PageHeader
        eyebrow="Super Administrator"
        title="Platform console"
        description="Tenants, users and platform-wide activity."
      />
      <section aria-label="Platform summary" className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Organizations" value={organizations.length} />
        <StatCard label="Users" value={usersRes.count ?? 0} />
        <StatCard
          label="Suspended tenants"
          value={organizations.filter((o) => o.status === "suspended").length}
        />
      </section>
      <Card>
        <CardHeader>
          <CardTitle>Organizations</CardTitle>
          <CardDescription>
            Suspending a tenant immediately removes every member&apos;s permissions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="divide-border divide-y">
            {organizations.map((org) => (
              <li
                key={org.id}
                className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-medium">{org.name}</p>
                  <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-mono">/o/{org.slug}</span>
                    <span>{ORGANIZATION_TYPE_LABELS[org.type]}</span>
                    <span>{org.organization_members[0]?.count ?? 0} members</span>
                    <span>Created {formatDateTime(org.created_at, tz)}</span>
                    <Badge tone={org.status === "active" ? "success" : "warning"}>{org.status}</Badge>
                  </div>
                </div>
                <OrganizationStatusToggle
                  organizationId={org.id}
                  organizationName={org.name}
                  status={org.status}
                />
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent tenant activity</CardTitle>
          </CardHeader>
          <CardContent>
            <AuditList entries={audit} timeZone={tz} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Contact requests</CardTitle>
            <CardDescription>Latest submissions from the public contact form.</CardDescription>
          </CardHeader>
          <CardContent>
            {contactRes.data.length === 0 ? (
              <p className="text-muted-foreground text-sm">No contact requests yet.</p>
            ) : (
              <ul className="divide-border divide-y">
                {contactRes.data.map((req) => (
                  <li key={req.id} className="space-y-1 py-3 text-sm">
                    <p className="font-medium">
                      {req.name}{" "}
                      <span className="text-muted-foreground font-normal">&lt;{req.email}&gt;</span>
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {req.topic} · {req.organization ?? "No organization"} ·{" "}
                      {formatDateTime(req.created_at, tz)}
                    </p>
                    <p className="text-muted-foreground line-clamp-3 whitespace-pre-wrap">{req.message}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

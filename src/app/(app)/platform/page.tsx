import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader, StatCard } from "@/components/ui/misc";
import { AuditList } from "@/features/audit/components/audit-list";
import { listPlatformAudit } from "@/features/audit/server/queries";
import { requireSuperAdmin } from "@/features/auth/server/session";
import { OrganizationStatusToggle } from "@/features/organizations/components/organization-status-toggle";
import { getFormatContext } from "@/features/preferences/server";
import { formatDateTime, formatNumber } from "@/lib/i18n-format";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("platform.console");
  return { title: t("title") };
}

export default async function PlatformConsolePage() {
  const viewer = await requireSuperAdmin();
  const supabase = await createSupabaseServerClient();

  // Super-admin visibility is granted by RLS (private.is_super_admin()).
  const [t, tTypes, tOrgs, fmt, orgsRes, usersRes, contactRes, audit] = await Promise.all([
    getTranslations("platform.console"),
    getTranslations("orgForms.types"),
    getTranslations("orgs"),
    getFormatContext(viewer.profile.timezone),
    supabase
      .from("organizations")
      .select("id, name, slug, type, status, is_system, created_at, organization_members(count)")
      .order("is_system", { ascending: false })
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
  const n = (value: number) => formatNumber(value, fmt);

  return (
    <div className="space-y-8">
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />
      <section aria-label={t("summaryLabel")} className="grid gap-4 sm:grid-cols-3">
        <StatCard label={t("organizations")} value={n(organizations.length)} />
        <StatCard label={t("users")} value={n(usersRes.count ?? 0)} />
        <StatCard
          label={t("suspended")}
          value={n(organizations.filter((o) => o.status === "suspended").length)}
        />
      </section>
      <Card>
        <CardHeader>
          <CardTitle>{t("orgsTitle")}</CardTitle>
          <CardDescription>{t("orgsDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="divide-border divide-y">
            {organizations.map((org) => (
              <li
                key={org.id}
                className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-medium">{org.is_system ? tOrgs("publicName") : org.name}</p>
                  <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-mono" lang="en">{`/o/${org.slug}`}</span>
                    <span>{org.is_system ? tOrgs("publicDescription") : tTypes(org.type)}</span>
                    <span>{t("memberCount", { count: n(org.organization_members[0]?.count ?? 0) })}</span>
                    <span>{t("created", { date: formatDateTime(org.created_at, fmt) })}</span>
                    {org.is_system ? <Badge tone="indigo">{t("system")}</Badge> : null}
                    <Badge tone={org.status === "active" ? "success" : "warning"}>
                      {t(`status.${org.status}`)}
                    </Badge>
                  </div>
                </div>
                {org.is_system ? (
                  <p className="text-muted-foreground text-xs">{t("systemProtected")}</p>
                ) : (
                  <OrganizationStatusToggle
                    organizationId={org.id}
                    organizationName={org.name}
                    status={org.status}
                  />
                )}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("activityTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <AuditList entries={audit} format={fmt} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t("contactTitle")}</CardTitle>
            <CardDescription>{t("contactDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            {contactRes.data.length === 0 ? (
              <p className="text-muted-foreground text-sm">{t("contactEmpty")}</p>
            ) : (
              <ul className="divide-border divide-y">
                {contactRes.data.map((req) => (
                  <li key={req.id} className="space-y-1 py-3 text-sm">
                    <p className="font-medium">
                      {req.name} <span className="text-muted-foreground font-normal">{`<${req.email}>`}</span>
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {[
                        req.topic,
                        req.organization ?? t("noOrganization"),
                        formatDateTime(req.created_at, fmt),
                      ].join(" · ")}
                    </p>
                    <p className="text-muted-foreground line-clamp-3 whitespace-pre-wrap">{req.message}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

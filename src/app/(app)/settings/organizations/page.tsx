import { Building2, GraduationCap } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";
import { ORG_ROLE_DISPLAY } from "@/features/access/roles";
import { requireViewer } from "@/features/auth/server/session";
import { JoinPublicButton } from "@/features/organizations/components/join-public-button";
import { LeaveOrganizationButton } from "@/features/organizations/components/leave-organization-button";
import { organizationDisplayName } from "@/features/organizations/display";
import { getFormatContext } from "@/features/preferences/server";
import { formatDateTime } from "@/lib/i18n-format";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("settings.organizations");
  return { title: t("title") };
}

export default async function OrganizationsSettingsPage() {
  const viewer = await requireViewer({ returnTo: "/settings/organizations" });
  const [t, tRoles, tOrgs, tTypes, fmt] = await Promise.all([
    getTranslations("settings.organizations"),
    getTranslations("roles"),
    getTranslations("orgs"),
    getTranslations("orgForms.types"),
    getFormatContext(viewer.profile.timezone),
  ]);
  const inPublic = viewer.memberships.some((m) => m.organization.is_system);
  const memberships = [...viewer.memberships].sort(
    (a, b) => Number(b.organization.is_system) - Number(a.organization.is_system),
  );

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <Button asChild variant="secondary">
            <Link href="/onboarding/organization">{t("create")}</Link>
          </Button>
        }
      />
      {!inPublic ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("joinPublicTitle")}</CardTitle>
            <CardDescription>{t("joinPublicBody")}</CardDescription>
          </CardHeader>
          <CardContent>
            <JoinPublicButton size="md" />
          </CardContent>
        </Card>
      ) : null}
      {memberships.length > 0 ? (
        <Card>
          <ul className="divide-border divide-y">
            {memberships.map((m) => {
              const name = organizationDisplayName(m.organization, tOrgs("publicName"));
              return (
                <li
                  key={m.organizationId}
                  className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    {m.organization.is_system ? (
                      <GraduationCap
                        className="text-muted-foreground mt-1 size-5 shrink-0"
                        aria-hidden="true"
                      />
                    ) : (
                      <Building2 className="text-muted-foreground mt-1 size-5 shrink-0" aria-hidden="true" />
                    )}
                    <div className="min-w-0">
                      <Link href={`/o/${m.organization.slug}`} className="font-semibold hover:underline">
                        {name}
                      </Link>
                      <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-2 text-xs">
                        <Badge tone="indigo">{tRoles(`${ORG_ROLE_DISPLAY[m.role]}.label`)}</Badge>
                        <span>
                          {m.organization.is_system
                            ? tOrgs("publicDescription")
                            : tTypes(m.organization.type)}
                        </span>
                        <span>{t("joined", { date: formatDateTime(m.joinedAt, fmt) })}</span>
                        {m.organization.status !== "active" ? (
                          <Badge tone="warning">{t("suspended")}</Badge>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  {m.organization.is_system ? (
                    <p className="text-muted-foreground text-xs sm:max-w-48 sm:text-right">
                      {t("publicCannotLeave")}
                    </p>
                  ) : (
                    <LeaveOrganizationButton organizationId={m.organizationId} organizationName={name} />
                  )}
                </li>
              );
            })}
          </ul>
        </Card>
      ) : null}
    </>
  );
}

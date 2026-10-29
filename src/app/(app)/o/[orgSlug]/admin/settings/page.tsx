import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";
import { OrganizationSettingsForm } from "@/features/organizations/components/organization-settings-form";
import { requireOrgPermission } from "@/features/organizations/server/context";
import { getOrganization } from "@/features/organizations/server/queries";
import { getFormatContext } from "@/features/preferences/server";
import { formatDateTime } from "@/lib/i18n-format";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("orgSettingsPage");
  return { title: t("title") };
}

export default async function OrganizationSettingsPage({ params }: PageProps<"/o/[orgSlug]/admin/settings">) {
  const { orgSlug } = await params;
  const { viewer, membership } = await requireOrgPermission(orgSlug, "org.update");
  const [t, fmt, organization] = await Promise.all([
    getTranslations("orgSettingsPage"),
    getFormatContext(viewer.profile.timezone),
    getOrganization(membership.organizationId),
  ]);
  if (!organization) notFound();

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("description")} />
      <Card>
        <CardHeader>
          <CardTitle>{t("profileTitle")}</CardTitle>
          <CardDescription>
            {t.rich("profileDescription", {
              slug: () => (
                <span className="text-foreground font-mono" lang="en">
                  {`/o/${organization.slug}`}
                </span>
              ),
              date: formatDateTime(organization.created_at, fmt),
            })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OrganizationSettingsForm
            defaults={{
              organizationId: organization.id,
              name: organization.name,
              type: organization.type,
              website: organization.website ?? "",
              contactEmail: organization.contact_email ?? "",
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}

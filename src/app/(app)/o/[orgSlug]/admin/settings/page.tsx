import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";
import { OrganizationSettingsForm } from "@/features/organizations/components/organization-settings-form";
import { requireOrgPermission } from "@/features/organizations/server/context";
import { getOrganization } from "@/features/organizations/server/queries";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Organization settings" };

export default async function OrganizationSettingsPage({ params }: PageProps<"/o/[orgSlug]/admin/settings">) {
  const { orgSlug } = await params;
  const { viewer, membership } = await requireOrgPermission(orgSlug, "org.update");
  const organization = await getOrganization(membership.organizationId);
  if (!organization) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Organization settings"
        description="Details shown to your members and on invitations."
      />
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            Workspace address <span className="text-foreground font-mono">/o/{organization.slug}</span> ·
            created {formatDateTime(organization.created_at, viewer.profile.timezone)}
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

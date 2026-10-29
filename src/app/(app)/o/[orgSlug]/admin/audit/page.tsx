import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";
import { AuditList } from "@/features/audit/components/audit-list";
import { AUDIT_PAGE_SIZE, listOrganizationAudit } from "@/features/audit/server/queries";
import { requireOrgPermission } from "@/features/organizations/server/context";

export const metadata: Metadata = { title: "Audit log" };

export default async function AuditPage({ params, searchParams }: PageProps<"/o/[orgSlug]/admin/audit">) {
  const { orgSlug } = await params;
  const query = await searchParams;
  const { viewer, membership } = await requireOrgPermission(orgSlug, "audit.read");
  const page = Math.max(
    1,
    Math.min(10_000, Number.parseInt(typeof query.page === "string" ? query.page : "1", 10) || 1),
  );
  const { entries, total } = await listOrganizationAudit(membership.organizationId, page);
  const pageCount = Math.max(1, Math.ceil(total / AUDIT_PAGE_SIZE));
  const base = `/o/${orgSlug}/admin/audit`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit log"
        description="An append-only record of membership, invitation and organization changes. Times are shown in your time zone."
      />
      <Card>
        <CardContent className="pt-2 sm:pt-2">
          <AuditList entries={entries} timeZone={viewer.profile.timezone} />
        </CardContent>
      </Card>
      {pageCount > 1 ? (
        <nav aria-label="Audit log pages" className="flex items-center justify-between">
          <p className="text-muted-foreground text-sm">
            Page {page} of {pageCount}
          </p>
          <div className="flex gap-2">
            {page > 1 ? (
              <Button asChild variant="secondary" size="sm">
                <Link href={`${base}?page=${page - 1}`}>Previous</Link>
              </Button>
            ) : null}
            {page < pageCount ? (
              <Button asChild variant="secondary" size="sm">
                <Link href={`${base}?page=${page + 1}`}>Next</Link>
              </Button>
            ) : null}
          </div>
        </nav>
      ) : null}
    </div>
  );
}

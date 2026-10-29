import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";
import { AuditList } from "@/features/audit/components/audit-list";
import { AUDIT_PAGE_SIZE, listOrganizationAudit } from "@/features/audit/server/queries";
import { requireOrgPermission } from "@/features/organizations/server/context";
import { getFormatContext } from "@/features/preferences/server";
import { formatNumber } from "@/lib/i18n-format";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auditPage");
  return { title: t("title") };
}

export default async function AuditPage({ params, searchParams }: PageProps<"/o/[orgSlug]/admin/audit">) {
  const { orgSlug } = await params;
  const query = await searchParams;
  const { viewer, membership } = await requireOrgPermission(orgSlug, "audit.read");
  const page = Math.max(
    1,
    Math.min(10_000, Number.parseInt(typeof query.page === "string" ? query.page : "1", 10) || 1),
  );
  const [t, fmt, { entries, total }] = await Promise.all([
    getTranslations("auditPage"),
    getFormatContext(viewer.profile.timezone),
    listOrganizationAudit(membership.organizationId, page),
  ]);
  const pageCount = Math.max(1, Math.ceil(total / AUDIT_PAGE_SIZE));
  const base = `/o/${orgSlug}/admin/audit`;

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("description")} />
      <Card>
        <CardContent className="pt-2 sm:pt-2">
          <AuditList entries={entries} format={fmt} />
        </CardContent>
      </Card>
      {pageCount > 1 ? (
        <nav aria-label={t("pagination")} className="flex items-center justify-between">
          <p className="text-muted-foreground text-sm">
            {t("page", { page: formatNumber(page, fmt), total: formatNumber(pageCount, fmt) })}
          </p>
          <div className="flex gap-2">
            {page > 1 ? (
              <Button asChild variant="secondary" size="sm">
                <Link href={`${base}?page=${page - 1}`}>{t("previous")}</Link>
              </Button>
            ) : null}
            {page < pageCount ? (
              <Button asChild variant="secondary" size="sm">
                <Link href={`${base}?page=${page + 1}`}>{t("next")}</Link>
              </Button>
            ) : null}
          </div>
        </nav>
      ) : null}
    </div>
  );
}

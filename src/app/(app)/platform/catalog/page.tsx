import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";
import { AuditList } from "@/features/audit/components/audit-list";
import { listCatalogAudit } from "@/features/audit/server/queries";
import { requireSuperAdmin } from "@/features/auth/server/session";
import { CatalogRowActions } from "@/features/catalog/components/row-actions";
import { loadAdminCatalog } from "@/features/catalog/server/queries";
import { CATALOG_ENTITIES, localized, type CatalogEntitySegment } from "@/features/catalog/types";
import { getFormatContext } from "@/features/preferences/server";
import { formatNumber } from "@/lib/i18n-format";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("catalogAdmin");
  return { title: t("title") };
}

type Row = { id: string; title: string; subtitle: string; active: boolean };

export default async function CatalogAdminPage() {
  const viewer = await requireSuperAdmin();
  const [t, locale, fmt, catalog, audit] = await Promise.all([
    getTranslations("catalogAdmin"),
    getLocale(),
    getFormatContext(viewer.profile.timezone),
    loadAdminCatalog(),
    listCatalogAudit(15),
  ]);
  const universityName = new Map(catalog.universities.map((u) => [u.id, localized(u, "name", locale)]));
  const targetCount = (universityId: string) =>
    catalog.targets.filter((x) => x.university_id === universityId).length;

  const sections: { segment: CatalogEntitySegment; rows: Row[] }[] = [
    {
      segment: "universities",
      rows: catalog.universities.map((u) => ({
        id: u.id,
        title: `${localized(u, "name", locale)} (${u.short_code})`,
        subtitle: [u.slug, t("targetCount", { count: formatNumber(targetCount(u.id), fmt) })].join(" · "),
        active: u.is_active,
      })),
    },
    {
      segment: "targets",
      rows: catalog.targets.map((x) => ({
        id: x.id,
        title: localized(x, "name", locale),
        subtitle: [universityName.get(x.university_id) ?? "", x.slug].join(" · "),
        active: x.is_active,
      })),
    },
    {
      segment: "subjects",
      rows: catalog.subjects.map((s) => ({
        id: s.id,
        title: localized(s, "name", locale),
        subtitle: s.slug,
        active: s.is_active,
      })),
    },
    {
      segment: "categories",
      rows: catalog.categories.map((c) => ({
        id: c.key,
        title: localized(c, "name", locale),
        subtitle: c.key,
        active: c.is_active,
      })),
    },
  ];

  const renderRows = (segment: CatalogEntitySegment, rows: Row[]): ReactNode =>
    rows.length === 0 ? (
      <p className="text-muted-foreground text-sm">{t("emptySection")}</p>
    ) : (
      <ul className="divide-border divide-y">
        {rows.map((row, index) => (
          <li
            key={row.id}
            className="flex flex-col gap-3 py-3 lg:flex-row lg:items-center lg:justify-between"
          >
            <div className="min-w-0">
              <p className="font-medium">
                {row.title}
                {!row.active ? (
                  <Badge tone="neutral" className="ml-2 align-middle">
                    {t("inactive")}
                  </Badge>
                ) : null}
              </p>
              <p className="text-muted-foreground truncate text-xs" lang="en">
                {row.subtitle}
              </p>
            </div>
            <CatalogRowActions
              entity={CATALOG_ENTITIES[segment]}
              id={row.id}
              name={row.title}
              active={row.active}
              editHref={`/platform/catalog/${segment}/${encodeURIComponent(row.id)}`}
              isFirst={index === 0}
              isLast={index === rows.length - 1}
            />
          </li>
        ))}
      </ul>
    );

  return (
    <div className="space-y-8">
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />
      {sections.map(({ segment, rows }) => (
        <Card key={segment}>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <CardTitle>{t(`sections.${segment}.title`)}</CardTitle>
              <CardDescription>{t(`sections.${segment}.description`)}</CardDescription>
            </div>
            <Button asChild size="sm">
              <Link href={`/platform/catalog/${segment}/new`}>
                <Plus aria-hidden="true" />
                {t(`sections.${segment}.add`)}
              </Link>
            </Button>
          </CardHeader>
          <CardContent>{renderRows(segment, rows)}</CardContent>
        </Card>
      ))}
      <Card>
        <CardHeader>
          <CardTitle>{t("activityTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <AuditList entries={audit} format={fmt} />
        </CardContent>
      </Card>
    </div>
  );
}

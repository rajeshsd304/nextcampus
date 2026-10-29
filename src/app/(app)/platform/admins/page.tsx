import { Crown, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Alert } from "@/components/ui/alert";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";
import { requireSuperAdmin } from "@/features/auth/server/session";
import { getFormatContext } from "@/features/preferences/server";
import { GrantAdminForm } from "@/features/platform-admins/components/grant-admin-form";
import { RevokeAdminButton } from "@/features/platform-admins/components/revoke-admin-button";
import { MAX_ADDITIONAL_ADMINS, MAX_PLATFORM_ADMINS } from "@/features/platform-admins/constants";
import { listPlatformAdmins } from "@/features/platform-admins/queries";
import { formatDateTime, formatNumber } from "@/lib/i18n-format";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("platformAdmins");
  return { title: t("title") };
}

export default async function PlatformAdminsPage() {
  const viewer = await requireSuperAdmin();
  const [t, fmt, admins] = await Promise.all([
    getTranslations("platformAdmins"),
    getFormatContext(viewer.profile.timezone),
    listPlatformAdmins(),
  ]);
  const additional = admins.filter((a) => !a.isPrimary).length;
  const full = admins.length >= MAX_PLATFORM_ADMINS;
  const n = (value: number) => formatNumber(value, fmt);

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description", { max: n(MAX_PLATFORM_ADMINS), additional: n(MAX_ADDITIONAL_ADMINS) })}
      />
      {!admins.some((a) => a.isPrimary) ? (
        <Alert tone="warning" title={t("noPrimaryTitle")}>
          {t("noPrimaryBody")}
        </Alert>
      ) : null}
      {!viewer.isPrimaryAdmin ? <Alert tone="info">{t("readOnly")}</Alert> : null}

      <Card>
        <CardHeader>
          <CardTitle>{t("listTitle")}</CardTitle>
          <CardDescription role="status">
            {t("seats", { used: n(additional), max: n(MAX_ADDITIONAL_ADMINS) })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="divide-border divide-y">
            {admins.map((admin) => {
              const name = admin.name ?? admin.email ?? t("unknown");
              return (
                <li
                  key={admin.userId}
                  className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar name={name} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {name}
                        {admin.userId === viewer.user.id ? (
                          <span className="text-muted-foreground">{` ${t("you")}`}</span>
                        ) : null}
                      </p>
                      <p className="text-muted-foreground truncate text-sm">{admin.email}</p>
                      <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-2 text-xs">
                        {admin.isPrimary ? (
                          <Badge tone="indigo">
                            <Crown className="size-3.5" aria-hidden="true" />
                            {t("primary")}
                          </Badge>
                        ) : (
                          <Badge>
                            <ShieldCheck className="size-3.5" aria-hidden="true" />
                            {t("additional")}
                          </Badge>
                        )}
                        <span>{t("since", { date: formatDateTime(admin.grantedAt, fmt) })}</span>
                      </div>
                    </div>
                  </div>
                  {viewer.isPrimaryAdmin && !admin.isPrimary ? (
                    <RevokeAdminButton userId={admin.userId} name={name} />
                  ) : null}
                  {admin.isPrimary ? (
                    <p className="text-muted-foreground text-xs sm:max-w-56 sm:text-right">
                      {t("primaryProtected")}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      {viewer.isPrimaryAdmin ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("addTitle")}</CardTitle>
            <CardDescription>{t("addDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {full ? <Alert tone="warning">{t("limitReached", { max: n(MAX_PLATFORM_ADMINS) })}</Alert> : null}
            <GrantAdminForm disabled={full} />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

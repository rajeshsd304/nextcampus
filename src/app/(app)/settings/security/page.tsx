import type { Metadata } from "next";
import { getMessages, getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";
import { SubmitButton } from "@/components/ui/submit-button";
import { lookupAuditLabel } from "@/features/audit/labels";
import { listMySecurityEvents } from "@/features/audit/server/queries";
import { signOutAction } from "@/features/auth/actions";
import { NewPasswordForm } from "@/features/auth/components/new-password-form";
import { requireViewer } from "@/features/auth/server/session";
import { getFormatContext } from "@/features/preferences/server";
import { formatDateTime } from "@/lib/i18n-format";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("settings.security");
  return { title: t("title") };
}

export default async function SecuritySettingsPage() {
  const viewer = await requireViewer({ returnTo: "/settings/security" });
  const [t, messages, fmt, events] = await Promise.all([
    getTranslations("settings.security"),
    getMessages(),
    getFormatContext(viewer.profile.timezone),
    listMySecurityEvents(viewer.user.id),
  ]);
  const hasPassword = viewer.user.providers.includes("email");
  const actionLabels = messages.audit.actions;

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      <Card>
        <CardHeader>
          <CardTitle>{t("methodsTitle")}</CardTitle>
          <CardDescription>{t("methodsDescription", { email: viewer.user.email })}</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-wrap gap-2">
            {viewer.user.providers.map((provider) => (
              <li key={provider}>
                <Badge tone="indigo">
                  {provider === "email"
                    ? t("providers.email")
                    : provider === "google"
                      ? t("providers.google")
                      : provider}
                </Badge>
              </li>
            ))}
            <li>
              <Badge tone={viewer.user.emailConfirmed ? "success" : "warning"}>
                {viewer.user.emailConfirmed ? t("emailVerified") : t("emailNotVerified")}
              </Badge>
            </li>
          </ul>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{hasPassword ? t("changePassword") : t("setPassword")}</CardTitle>
          <CardDescription>{hasPassword ? t("changePasswordHint") : t("setPasswordHint")}</CardDescription>
        </CardHeader>
        <CardContent>
          <NewPasswordForm submitLabel={hasPassword ? t("changePassword") : t("setPassword")} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t("activityTitle")}</CardTitle>
          <CardDescription>
            {t("activityDescription", { timezone: viewer.profile.timezone.replaceAll("_", " ") })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("activityEmpty")}</p>
          ) : (
            <ul className="divide-border divide-y">
              {events.map((event) => (
                <li
                  key={event.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm"
                >
                  <span>{lookupAuditLabel(actionLabels, event.action) ?? event.action}</span>
                  <time dateTime={event.created_at} className="text-muted-foreground text-xs">
                    {formatDateTime(event.created_at, fmt)}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t("signOutTitle")}</CardTitle>
          <CardDescription>{t("signOutDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={signOutAction}>
            <SubmitButton variant="secondary" pendingLabel={t("signingOut")}>
              {t("signOut")}
            </SubmitButton>
          </form>
        </CardContent>
      </Card>
    </>
  );
}

import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";
import { requireViewer, viewerDisplayName } from "@/features/auth/server/session";
import { getNumeralPreference } from "@/features/preferences/server";
import { PreferencesForm } from "@/features/profiles/components/preferences-form";
import { ProfileForm } from "@/features/profiles/components/profile-form";
import { getTimeZones } from "@/features/profiles/timezones";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("settings.profile");
  return { title: t("title") };
}

export default async function ProfileSettingsPage() {
  const viewer = await requireViewer({ returnTo: "/settings" });
  const [t, locale] = await Promise.all([getTranslations("settings.profile"), getLocale()]);
  const numerals = await getNumeralPreference(locale);
  const { profile } = viewer;

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      <Card>
        <CardHeader className="flex flex-row items-center gap-4">
          <Avatar name={viewerDisplayName(viewer)} src={profile.avatar_url} size="lg" />
          <div className="min-w-0">
            <CardTitle className="truncate">{viewerDisplayName(viewer)}</CardTitle>
            <CardDescription className="truncate">{profile.email}</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <ProfileForm
            mode={{ kind: "settings" }}
            timeZones={getTimeZones()}
            defaults={{
              fullName: profile.full_name ?? "",
              displayName: profile.display_name ?? "",
              timezone: profile.timezone,
              marketingOptIn: profile.marketing_opt_in,
            }}
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t("preferencesTitle")}</CardTitle>
          <CardDescription>{t("preferencesDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <PreferencesForm locale={locale} numerals={numerals} />
        </CardContent>
      </Card>
    </>
  );
}

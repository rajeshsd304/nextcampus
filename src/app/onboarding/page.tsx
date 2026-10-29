import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Card, CardContent } from "@/components/ui/card";
import { requireViewer } from "@/features/auth/server/session";
import { ProfileForm } from "@/features/profiles/components/profile-form";
import { getTimeZones } from "@/features/profiles/timezones";
import { safeRedirectPath } from "@/lib/redirect";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("onboarding.profile");
  return { title: t("title") };
}

export default async function OnboardingProfilePage({ searchParams }: PageProps<"/onboarding">) {
  const params = await searchParams;
  const next = safeRedirectPath(typeof params.next === "string" ? params.next : null);
  const viewer = await requireViewer({ allowIncompleteProfile: true, returnTo: "/onboarding" });
  if (viewer.profile.onboarded_at) redirect(next);
  const t = await getTranslations("onboarding.profile");

  return (
    <div className="animate-fade-up space-y-6 pt-6">
      <div className="space-y-2">
        <p className="text-primary text-sm font-semibold dark:text-indigo-300">{t("eyebrow")}</p>
        <h1 className="font-display text-3xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>
      <Card>
        <CardContent className="pt-6 sm:pt-6">
          <ProfileForm
            mode={{ kind: "onboarding", next }}
            timeZones={getTimeZones()}
            defaults={{
              fullName: viewer.profile.full_name ?? "",
              displayName: viewer.profile.display_name ?? "",
              timezone: viewer.profile.timezone,
              marketingOptIn: viewer.profile.marketing_opt_in,
            }}
          />
        </CardContent>
      </Card>
      <p className="text-muted-foreground text-center text-sm">
        {t("signedInAs", { email: viewer.user.email })}
      </p>
    </div>
  );
}

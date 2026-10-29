import type { Metadata } from "next";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";
import { requireViewer, viewerDisplayName } from "@/features/auth/server/session";
import { ProfileForm } from "@/features/profiles/components/profile-form";
import { getTimeZones } from "@/features/profiles/timezones";

export const metadata: Metadata = { title: "Profile settings" };

export default async function ProfileSettingsPage() {
  const viewer = await requireViewer({ returnTo: "/settings" });
  const { profile } = viewer;

  return (
    <>
      <PageHeader title="Profile" description="How you appear across NextCampus." />
      <Card>
        <CardHeader className="flex flex-row items-center gap-4">
          <Avatar name={viewerDisplayName(viewer)} src={profile.avatar_url} size="lg" />
          <div>
            <CardTitle>{viewerDisplayName(viewer)}</CardTitle>
            <CardDescription>{profile.email}</CardDescription>
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
    </>
  );
}

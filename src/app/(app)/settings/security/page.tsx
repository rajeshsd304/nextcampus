import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";
import { SubmitButton } from "@/components/ui/submit-button";
import { auditActionLabel } from "@/features/audit/labels";
import { listMySecurityEvents } from "@/features/audit/server/queries";
import { signOutAction } from "@/features/auth/actions";
import { NewPasswordForm } from "@/features/auth/components/new-password-form";
import { requireViewer } from "@/features/auth/server/session";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Security" };

const PROVIDER_LABELS: Record<string, string> = { email: "Email and password", google: "Google" };

export default async function SecuritySettingsPage() {
  const viewer = await requireViewer({ returnTo: "/settings/security" });
  const events = await listMySecurityEvents(viewer.user.id);
  const hasPassword = viewer.user.providers.includes("email");

  return (
    <>
      <PageHeader title="Security" description="Sign-in methods, password and recent account activity." />
      <Card>
        <CardHeader>
          <CardTitle>Sign-in methods</CardTitle>
          <CardDescription>Your account email is {viewer.user.email}.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-wrap gap-2">
            {viewer.user.providers.map((provider) => (
              <li key={provider}>
                <Badge tone="indigo">{PROVIDER_LABELS[provider] ?? provider}</Badge>
              </li>
            ))}
            <li>
              <Badge tone={viewer.user.emailConfirmed ? "success" : "warning"}>
                {viewer.user.emailConfirmed ? "Email verified" : "Email not verified"}
              </Badge>
            </li>
          </ul>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{hasPassword ? "Change password" : "Set a password"}</CardTitle>
          <CardDescription>
            {hasPassword
              ? "Choose a strong password you don't use anywhere else."
              : "Add a password so you can also sign in with your email address."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NewPasswordForm submitLabel={hasPassword ? "Change password" : "Set password"} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Recent security activity</CardTitle>
          <CardDescription>Times shown in {viewer.profile.timezone.replaceAll("_", " ")}.</CardDescription>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <p className="text-muted-foreground text-sm">No recent activity.</p>
          ) : (
            <ul className="divide-border divide-y">
              {events.map((event) => (
                <li key={event.id} className="flex items-center justify-between gap-4 py-2.5 text-sm">
                  <span>{auditActionLabel(event.action)}</span>
                  <time dateTime={event.created_at} className="text-muted-foreground text-xs">
                    {formatDateTime(event.created_at, viewer.profile.timezone)}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Sign out</CardTitle>
          <CardDescription>End your session on this device.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={signOutAction}>
            <SubmitButton variant="secondary" pendingLabel="Signing out">
              Sign out
            </SubmitButton>
          </form>
        </CardContent>
      </Card>
    </>
  );
}

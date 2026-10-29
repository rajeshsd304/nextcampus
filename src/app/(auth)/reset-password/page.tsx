import type { Metadata } from "next";
import { AuthHeading } from "@/features/auth/components/auth-card";
import { NewPasswordForm } from "@/features/auth/components/new-password-form";
import { requireViewer } from "@/features/auth/server/session";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false } };

export default async function ResetPasswordPage() {
  // Reached through the recovery link, which establishes a session first.
  const viewer = await requireViewer({ allowIncompleteProfile: true, returnTo: "/reset-password" });
  return (
    <>
      <AuthHeading title="Choose a new password" description={`Signed in as ${viewer.user.email}.`} />
      <NewPasswordForm redirectTo="/dashboard" submitLabel="Save password and continue" />
    </>
  );
}

import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AuthHeading } from "@/features/auth/components/auth-card";
import { NewPasswordForm } from "@/features/auth/components/new-password-form";
import { requireViewer } from "@/features/auth/server/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("authPages.reset");
  return { title: t("title"), robots: { index: false } };
}

export default async function ResetPasswordPage() {
  // Reached through the recovery link, which establishes a session first.
  const viewer = await requireViewer({ allowIncompleteProfile: true, returnTo: "/reset-password" });
  const t = await getTranslations("authPages.reset");
  return (
    <>
      <AuthHeading title={t("title")} description={t("signedInAs", { email: viewer.user.email })} />
      <NewPasswordForm redirectTo="/dashboard" submitLabel={t("submit")} />
    </>
  );
}

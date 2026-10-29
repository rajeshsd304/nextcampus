import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requestPasswordResetAction } from "@/features/auth/actions";
import { AuthHeading } from "@/features/auth/components/auth-card";
import { EmailOnlyForm } from "@/features/auth/components/email-only-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("authPages.forgot");
  return { title: t("title") };
}

export default async function ForgotPasswordPage() {
  const t = await getTranslations("authPages.forgot");
  return (
    <>
      <AuthHeading title={t("title")} description={t("description")} />
      <EmailOnlyForm
        action={requestPasswordResetAction}
        submitLabel={t("submit")}
        successMessage={t("success")}
      />
      <p className="text-muted-foreground mt-8 text-center text-sm">
        {t("remembered")}{" "}
        <Link href="/sign-in" className="text-primary font-semibold hover:underline dark:text-indigo-300">
          {t("backToSignIn")}
        </Link>
      </p>
    </>
  );
}

import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { resendConfirmationAction } from "@/features/auth/actions";
import { AuthHeading } from "@/features/auth/components/auth-card";
import { EmailOnlyForm } from "@/features/auth/components/email-only-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("authPages.checkEmail");
  return { title: t("title") };
}

export default async function CheckEmailPage({ searchParams }: PageProps<"/check-email">) {
  const t = await getTranslations("authPages.checkEmail");
  const params = await searchParams;
  const email = typeof params.email === "string" ? params.email.slice(0, 320) : "";
  return (
    <>
      <AuthHeading title={t("title")} description={t("description")} />
      <EmailOnlyForm
        action={resendConfirmationAction}
        defaultEmail={email}
        submitLabel={t("submit")}
        successMessage={t("success")}
      />
    </>
  );
}

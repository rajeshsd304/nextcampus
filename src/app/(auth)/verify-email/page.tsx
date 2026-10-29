import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { AuthHeading } from "@/features/auth/components/auth-card";
import { OtpForm } from "@/features/auth/components/otp-form";
import { safeRedirectPath } from "@/lib/redirect";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("authPages.verify");
  return { title: t("title"), robots: { index: false } };
}

export default async function VerifyEmailPage({ searchParams }: PageProps<"/verify-email">) {
  const t = await getTranslations("authPages.verify");
  const params = await searchParams;
  const email = typeof params.email === "string" ? params.email.slice(0, 320) : "";
  const next =
    typeof params.next === "string" ? safeRedirectPath(params.next, { fallback: "/onboarding" }) : undefined;

  return (
    <>
      <AuthHeading
        title={t("title")}
        description={
          email
            ? t.rich("descriptionWithEmail", {
                email,
                strong: (chunks) => <strong className="text-foreground">{chunks}</strong>,
              })
            : t("description")
        }
      />
      <OtpForm email={email} next={next} justSent={params.sent === "1"} />
      <p className="text-muted-foreground mt-8 text-center text-sm">
        {t("mailNote")}{" "}
        <Link href="/sign-in" className="text-primary font-semibold hover:underline dark:text-indigo-300">
          {t("backToSignIn")}
        </Link>
      </p>
    </>
  );
}

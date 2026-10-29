import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { AuthHeading, Divider } from "@/features/auth/components/auth-card";
import { GoogleSignInButton } from "@/features/auth/components/google-button";
import { SignUpForm } from "@/features/auth/components/sign-up-form";
import { safeRedirectPath } from "@/lib/redirect";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("authPages.signUp");
  return { title: t("metaTitle") };
}

export default async function SignUpPage({ searchParams }: PageProps<"/sign-up">) {
  const t = await getTranslations("authPages");
  const params = await searchParams;
  const next = typeof params.next === "string" ? safeRedirectPath(params.next) : undefined;

  return (
    <>
      <AuthHeading title={t("signUp.title")} description={t("signUp.description")} />
      <GoogleSignInButton next={next} />
      <Divider label={t("orWithEmail")} />
      <SignUpForm next={next} />
      <p className="text-muted-foreground mt-8 text-center text-sm">
        {t("signUp.haveAccount")}{" "}
        <Link
          href={next ? `/sign-in?next=${encodeURIComponent(next)}` : "/sign-in"}
          className="text-primary font-semibold hover:underline dark:text-indigo-300"
        >
          {t("signUp.signIn")}
        </Link>
      </p>
    </>
  );
}

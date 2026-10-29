import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Alert } from "@/components/ui/alert";
import { AuthHeading, Divider, isAuthUrlError } from "@/features/auth/components/auth-card";
import { GoogleSignInButton } from "@/features/auth/components/google-button";
import { SignInForm } from "@/features/auth/components/sign-in-form";
import { safeRedirectPath } from "@/lib/redirect";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("authPages.signIn");
  return { title: t("metaTitle") };
}

export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  const t = await getTranslations("authPages");
  const params = await searchParams;
  const nextParam = typeof params.next === "string" ? params.next : undefined;
  const next = nextParam ? safeRedirectPath(nextParam) : undefined;
  const errorKey = isAuthUrlError(params.error) ? params.error : undefined;

  return (
    <>
      <AuthHeading title={t("signIn.title")} description={t("signIn.description")} />
      {errorKey ? (
        <Alert tone="danger" className="mb-6" live>
          {t(`urlErrors.${errorKey}`)}
        </Alert>
      ) : null}
      <GoogleSignInButton next={next} />
      <Divider label={t("orWithEmail")} />
      <SignInForm next={next} />
      <p className="text-muted-foreground mt-8 text-center text-sm">
        {t("signIn.newHere")}{" "}
        <Link
          href={next ? `/sign-up?next=${encodeURIComponent(next)}` : "/sign-up"}
          className="text-primary font-semibold hover:underline dark:text-indigo-300"
        >
          {t("signIn.createAccount")}
        </Link>
      </p>
    </>
  );
}

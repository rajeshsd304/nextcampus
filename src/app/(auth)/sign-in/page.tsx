import type { Metadata } from "next";
import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { AUTH_ERROR_MESSAGES, AuthHeading, Divider } from "@/features/auth/components/auth-card";
import { GoogleSignInButton } from "@/features/auth/components/google-button";
import { SignInForm } from "@/features/auth/components/sign-in-form";
import { safeRedirectPath } from "@/lib/redirect";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  const params = await searchParams;
  const nextParam = typeof params.next === "string" ? params.next : undefined;
  const next = nextParam ? safeRedirectPath(nextParam) : undefined;
  const errorKey = typeof params.error === "string" ? params.error : undefined;
  const error = errorKey ? AUTH_ERROR_MESSAGES[errorKey] : undefined;

  return (
    <>
      <AuthHeading title="Welcome back" description="Sign in to your NextCampus workspace." />
      {error ? (
        <Alert tone="danger" className="mb-6" live>
          {error}
        </Alert>
      ) : null}
      <GoogleSignInButton next={next} />
      <Divider label="or with email" />
      <SignInForm next={next} />
      <p className="text-muted-foreground mt-8 text-center text-sm">
        New to NextCampus?{" "}
        <Link
          href={next ? `/sign-up?next=${encodeURIComponent(next)}` : "/sign-up"}
          className="text-primary font-semibold hover:underline dark:text-indigo-300"
        >
          Create an account
        </Link>
      </p>
    </>
  );
}

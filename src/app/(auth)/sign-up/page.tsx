import type { Metadata } from "next";
import Link from "next/link";
import { AuthHeading, Divider } from "@/features/auth/components/auth-card";
import { GoogleSignInButton } from "@/features/auth/components/google-button";
import { SignUpForm } from "@/features/auth/components/sign-up-form";
import { safeRedirectPath } from "@/lib/redirect";

export const metadata: Metadata = { title: "Create your account" };

export default async function SignUpPage({ searchParams }: PageProps<"/sign-up">) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? safeRedirectPath(params.next) : undefined;

  return (
    <>
      <AuthHeading
        title="Create your account"
        description="Join your institution's workspace or set up your own in minutes."
      />
      <GoogleSignInButton next={next} />
      <Divider label="or with email" />
      <SignUpForm next={next} />
      <p className="text-muted-foreground mt-8 text-center text-sm">
        Already have an account?{" "}
        <Link
          href={next ? `/sign-in?next=${encodeURIComponent(next)}` : "/sign-in"}
          className="text-primary font-semibold hover:underline dark:text-indigo-300"
        >
          Sign in
        </Link>
      </p>
    </>
  );
}

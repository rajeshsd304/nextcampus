import type { Metadata } from "next";
import Link from "next/link";
import { requestPasswordResetAction } from "@/features/auth/actions";
import { AuthHeading } from "@/features/auth/components/auth-card";
import { EmailOnlyForm } from "@/features/auth/components/email-only-form";

export const metadata: Metadata = { title: "Reset your password" };

export default function ForgotPasswordPage() {
  return (
    <>
      <AuthHeading
        title="Reset your password"
        description="Enter the email you use for NextCampus and we'll send you a secure reset link."
      />
      <EmailOnlyForm
        action={requestPasswordResetAction}
        submitLabel="Send reset link"
        successMessage="If an account exists for that email, a reset link is on its way. It expires in one hour."
      />
      <p className="text-muted-foreground mt-8 text-center text-sm">
        Remembered it?{" "}
        <Link href="/sign-in" className="text-primary font-semibold hover:underline dark:text-indigo-300">
          Back to sign in
        </Link>
      </p>
    </>
  );
}

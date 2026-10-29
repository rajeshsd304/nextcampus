import type { Metadata } from "next";
import { resendConfirmationAction } from "@/features/auth/actions";
import { AuthHeading } from "@/features/auth/components/auth-card";
import { EmailOnlyForm } from "@/features/auth/components/email-only-form";

export const metadata: Metadata = { title: "Confirm your email" };

export default async function CheckEmailPage({ searchParams }: PageProps<"/check-email">) {
  const params = await searchParams;
  const email = typeof params.email === "string" ? params.email.slice(0, 320) : "";
  return (
    <>
      <AuthHeading
        title="Confirm your email"
        description="Didn't receive the confirmation link? Request a new one. Links expire after 24 hours."
      />
      <EmailOnlyForm
        action={resendConfirmationAction}
        defaultEmail={email}
        submitLabel="Resend confirmation link"
        successMessage="If an unconfirmed account exists for that email, a new confirmation link is on its way."
      />
    </>
  );
}

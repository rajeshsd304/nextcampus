"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { MailCheck } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/misc";
import { applyActionErrors } from "@/lib/forms";
import { signUpAction } from "../actions";
import { signUpSchema, type SignUpInput } from "../schemas";
import { FormError } from "./form-error";
import { PasswordInput } from "./password-input";

export function SignUpForm({ next }: { next?: string | undefined }) {
  const [pending, startTransition] = useTransition();
  const [sentTo, setSentTo] = useState<string | null>(null);
  const form = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { fullName: "", email: "", password: "", acceptTerms: false, next },
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await signUpAction(values);
      if (!result) return;
      if (result.ok) setSentTo(result.data.email);
      else applyActionErrors(form, result, ["fullName", "email", "password", "acceptTerms"]);
    });
  });

  if (sentTo) {
    return (
      <div className="space-y-4" role="status">
        <div className="bg-accent text-accent-foreground flex size-12 items-center justify-center rounded-2xl">
          <MailCheck className="size-6" aria-hidden="true" />
        </div>
        <h2 className="text-lg font-semibold">Check your inbox</h2>
        <p className="text-muted-foreground text-sm">
          We sent a confirmation link to <strong className="text-foreground">{sentTo}</strong>. Open it on
          this device to activate your account. The link expires in 24 hours.
        </p>
        <Alert tone="info">
          Didn&apos;t get it? Check your spam folder, or request a new link from the sign-in page.
        </Alert>
        <Button asChild variant="secondary" className="w-full">
          <Link href={`/check-email?email=${encodeURIComponent(sentTo)}`}>Resend confirmation</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <FormError message={errors.root?.server?.message} />
      <FormField id="fullName" label="Full name" error={errors.fullName?.message}>
        <Input autoComplete="name" {...form.register("fullName")} />
      </FormField>
      <FormField id="email" label="Work or school email" error={errors.email?.message}>
        <Input type="email" autoComplete="email" inputMode="email" {...form.register("email")} />
      </FormField>
      <FormField
        id="password"
        label="Password"
        description="At least 10 characters, including a letter and a number."
        error={errors.password?.message}
      >
        <PasswordInput autoComplete="new-password" {...form.register("password")} />
      </FormField>
      <div className="space-y-1.5">
        <div className="flex items-start gap-3">
          <input
            id="acceptTerms"
            type="checkbox"
            className="border-input mt-0.5 size-4 rounded accent-indigo-600"
            aria-invalid={errors.acceptTerms ? true : undefined}
            aria-describedby={errors.acceptTerms ? "acceptTerms-error" : undefined}
            {...form.register("acceptTerms")}
          />
          <label htmlFor="acceptTerms" className="text-muted-foreground text-sm">
            I agree to the{" "}
            <Link
              href="/legal/terms"
              className="text-primary font-medium underline-offset-2 hover:underline dark:text-indigo-300"
            >
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link
              href="/legal/privacy"
              className="text-primary font-medium underline-offset-2 hover:underline dark:text-indigo-300"
            >
              Privacy Policy
            </Link>
            .
          </label>
        </div>
        {errors.acceptTerms ? (
          <p id="acceptTerms-error" className="text-danger text-sm font-medium">
            {errors.acceptTerms.message}
          </p>
        ) : null}
      </div>
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? <Spinner label="Creating account" /> : null}
        Create account
      </Button>
    </form>
  );
}

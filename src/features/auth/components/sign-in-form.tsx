"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/misc";
import { applyActionErrors } from "@/lib/forms";
import { signInWithPasswordAction } from "../actions";
import { signInSchema, type SignInInput } from "../schemas";
import { FormError } from "./form-error";
import { PasswordInput } from "./password-input";

export function SignInForm({ next }: { next?: string | undefined }) {
  const t = useTranslations("authForms");
  const [pending, startTransition] = useTransition();
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const form = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "", next },
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      setUnverifiedEmail(null);
      const result = await signInWithPasswordAction(values);
      if (result && !result.ok) {
        applyActionErrors(form, result, ["email", "password"]);
        if (result.error.code === "email_not_confirmed") setUnverifiedEmail(values.email);
      }
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <FormError message={errors.root?.server?.message} />
      {unverifiedEmail ? (
        <Link
          href={`/verify-email?email=${encodeURIComponent(unverifiedEmail)}`}
          className="text-primary inline-flex min-h-11 items-center text-sm font-semibold hover:underline dark:text-indigo-300"
        >
          {t("verifyNow")}
        </Link>
      ) : null}
      <FormField id="email" label={t("email")} error={errors.email?.message}>
        <Input type="email" autoComplete="email" inputMode="email" {...form.register("email")} />
      </FormField>
      <FormField id="password" label={t("password")} error={errors.password?.message}>
        <PasswordInput autoComplete="current-password" {...form.register("password")} />
      </FormField>
      <div className="flex justify-end">
        <Link
          href="/forgot-password"
          className="text-primary inline-flex min-h-11 items-center text-sm font-medium hover:underline dark:text-indigo-300"
        >
          {t("forgotPassword")}
        </Link>
      </div>
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? <Spinner label={t("signingIn")} /> : null}
        {t("signIn")}
      </Button>
    </form>
  );
}

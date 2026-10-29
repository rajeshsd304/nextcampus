"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/misc";
import { useMessageText } from "@/i18n/use-message-text";
import { applyActionErrors } from "@/lib/forms";
import { signUpAction } from "../actions";
import { signUpSchema, type SignUpInput } from "../schemas";
import { FormError } from "./form-error";
import { PasswordInput } from "./password-input";

const legalLink = "font-medium text-primary underline-offset-2 hover:underline dark:text-indigo-300";

export function SignUpForm({ next }: { next?: string | undefined }) {
  const t = useTranslations("authForms");
  const text = useMessageText();
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const form = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { fullName: "", email: "", password: "", acceptTerms: false, next },
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await signUpAction(values);
      if (!result) return;
      if (result.ok) {
        const params = new URLSearchParams({ email: result.data.email, next: result.data.next, sent: "1" });
        router.push(`/verify-email?${params.toString()}`);
      } else applyActionErrors(form, result, ["fullName", "email", "password", "acceptTerms"]);
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <FormError message={errors.root?.server?.message} />
      <FormField id="fullName" label={t("fullName")} error={errors.fullName?.message}>
        <Input autoComplete="name" {...form.register("fullName")} />
      </FormField>
      <FormField id="email" label={t("email")} error={errors.email?.message}>
        <Input type="email" autoComplete="email" inputMode="email" {...form.register("email")} />
      </FormField>
      <FormField
        id="password"
        label={t("password")}
        description={t("passwordHint")}
        error={errors.password?.message}
      >
        <PasswordInput autoComplete="new-password" {...form.register("password")} />
      </FormField>
      <div className="space-y-1.5">
        <div className="flex items-start gap-3">
          <input
            id="acceptTerms"
            type="checkbox"
            className="border-input mt-1 size-5 shrink-0 rounded accent-indigo-600"
            aria-invalid={errors.acceptTerms ? true : undefined}
            aria-describedby={errors.acceptTerms ? "acceptTerms-error" : undefined}
            {...form.register("acceptTerms")}
          />
          <label htmlFor="acceptTerms" className="text-muted-foreground text-sm">
            {t.rich("acceptTerms", {
              terms: (chunks) => (
                <Link href="/legal/terms" className={legalLink}>
                  {chunks}
                </Link>
              ),
              privacy: (chunks) => (
                <Link href="/legal/privacy" className={legalLink}>
                  {chunks}
                </Link>
              ),
            })}
          </label>
        </div>
        {errors.acceptTerms ? (
          <p id="acceptTerms-error" className="text-danger text-sm font-medium">
            {text(errors.acceptTerms.message)}
          </p>
        ) : null}
      </div>
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? <Spinner label={t("creatingAccount")} /> : null}
        {t("createAccount")}
      </Button>
    </form>
  );
}

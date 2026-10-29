"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Spinner } from "@/components/ui/misc";
import { useMessageText } from "@/i18n/use-message-text";
import { applyActionErrors } from "@/lib/forms";
import { updatePasswordAction } from "../actions";
import { newPasswordFormSchema, type NewPasswordInput } from "../schemas";
import { FormError } from "./form-error";
import { PasswordInput } from "./password-input";

export function NewPasswordForm({ redirectTo, submitLabel }: { redirectTo?: string; submitLabel: string }) {
  const t = useTranslations("authForms");
  const text = useMessageText();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [success, setSuccess] = useState<string | null>(null);
  const form = useForm<NewPasswordInput>({
    resolver: zodResolver(newPasswordFormSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) => {
    setSuccess(null);
    startTransition(async () => {
      const result = await updatePasswordAction(values);
      if (!result.ok) {
        applyActionErrors(form, result, ["password", "confirmPassword"]);
        return;
      }
      form.reset();
      setSuccess(text(result.message) ?? t("passwordUpdated"));
      if (redirectTo) router.push(redirectTo);
      else router.refresh();
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {success ? (
        <Alert tone="success" live>
          {success}
        </Alert>
      ) : null}
      <FormError message={errors.root?.server?.message} />
      <FormField
        id="password"
        label={t("newPassword")}
        description={t("passwordHint")}
        error={errors.password?.message}
      >
        <PasswordInput autoComplete="new-password" {...form.register("password")} />
      </FormField>
      <FormField id="confirmPassword" label={t("confirmNewPassword")} error={errors.confirmPassword?.message}>
        <PasswordInput autoComplete="new-password" {...form.register("confirmPassword")} />
      </FormField>
      <Button type="submit" disabled={pending}>
        {pending ? <Spinner label={t("saving")} /> : null}
        {submitLabel}
      </Button>
    </form>
  );
}

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Spinner } from "@/components/ui/misc";
import { applyActionErrors } from "@/lib/forms";
import { updatePasswordAction } from "../actions";
import { newPasswordFormSchema, type NewPasswordInput } from "../schemas";
import { FormError } from "./form-error";
import { PasswordInput } from "./password-input";

export function NewPasswordForm({
  redirectTo,
  submitLabel = "Update password",
}: {
  redirectTo?: string;
  submitLabel?: string;
}) {
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
      setSuccess(result.message ?? "Password updated.");
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
        label="New password"
        description="At least 10 characters, including a letter and a number."
        error={errors.password?.message}
      >
        <PasswordInput autoComplete="new-password" {...form.register("password")} />
      </FormField>
      <FormField id="confirmPassword" label="Confirm new password" error={errors.confirmPassword?.message}>
        <PasswordInput autoComplete="new-password" {...form.register("confirmPassword")} />
      </FormField>
      <Button type="submit" disabled={pending}>
        {pending ? <Spinner label="Saving" /> : null}
        {submitLabel}
      </Button>
    </form>
  );
}

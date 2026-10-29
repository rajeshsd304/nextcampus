"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/misc";
import type { ActionResult } from "@/lib/action-result";
import { applyActionErrors } from "@/lib/forms";
import { forgotPasswordSchema, type ForgotPasswordInput } from "../schemas";
import { FormError } from "./form-error";

/** Single email field form used for password reset and resending confirmation. */
export function EmailOnlyForm({
  action,
  submitLabel,
  successMessage,
  defaultEmail = "",
}: {
  action: (input: unknown) => Promise<ActionResult>;
  submitLabel: string;
  successMessage: string;
  defaultEmail?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: defaultEmail },
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await action(values);
      if (result.ok) setDone(true);
      else applyActionErrors(form, result, ["email"]);
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {done ? (
        <Alert tone="success" live>
          {successMessage}
        </Alert>
      ) : null}
      <FormError message={errors.root?.server?.message} />
      <FormField id="email" label="Email" error={errors.email?.message}>
        <Input type="email" autoComplete="email" inputMode="email" {...form.register("email")} />
      </FormField>
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? <Spinner label="Sending" /> : null}
        {submitLabel}
      </Button>
    </form>
  );
}

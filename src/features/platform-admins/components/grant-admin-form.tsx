"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/misc";
import { emailSchema } from "@/features/auth/schemas";
import { FormError } from "@/features/auth/components/form-error";
import { useMessageText } from "@/i18n/use-message-text";
import { applyActionErrors } from "@/lib/forms";
import { grantPlatformAdminAction } from "../actions";

const schema = z.object({ email: emailSchema });
type Values = z.input<typeof schema>;

export function GrantAdminForm({ disabled }: { disabled: boolean }) {
  const t = useTranslations("platformAdmins");
  const text = useMessageText();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: "" } });
  const { errors } = form.formState;

  const grant = () => {
    const email = confirming;
    setConfirming(null);
    if (!email) return;
    startTransition(async () => {
      const result = await grantPlatformAdminAction({ email });
      if (result.ok) {
        setSuccess(text(result.message) ?? null);
        form.reset();
        router.refresh();
      } else applyActionErrors(form, result, ["email"]);
    });
  };

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={form.handleSubmit((values) => {
        setSuccess(null);
        setConfirming(values.email);
      })}
    >
      {success ? (
        <Alert tone="success" live>
          {success}
        </Alert>
      ) : null}
      <FormError message={errors.root?.server?.message} />
      <FormField
        id="admin-email"
        label={t("emailLabel")}
        description={t("emailHint")}
        error={errors.email?.message}
      >
        <Input
          type="email"
          inputMode="email"
          autoComplete="off"
          disabled={disabled}
          {...form.register("email")}
        />
      </FormField>
      <Button type="submit" disabled={disabled || pending}>
        {pending ? <Spinner label={t("granting")} /> : null}
        {t("grant")}
      </Button>
      <ConfirmDialog
        open={confirming !== null}
        onOpenChange={(open) => (open ? null : setConfirming(null))}
        trigger={<span hidden />}
        title={t("grantTitle")}
        description={t("grantDescription", { email: confirming ?? "" })}
        confirmLabel={t("grant")}
        onConfirm={grant}
      />
    </form>
  );
}

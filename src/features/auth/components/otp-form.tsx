"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/misc";
import { useMessageText } from "@/i18n/use-message-text";
import { applyActionErrors } from "@/lib/forms";
import { resendVerificationCodeAction, verifyEmailOtpAction } from "../actions";
import { verifyOtpSchema, type VerifyOtpInput } from "../schemas";
import { FormError } from "./form-error";

/** Matches [auth.email] max_frequency in supabase/config.toml. */
export const RESEND_COOLDOWN_SECONDS = 60;

export function OtpForm({ email, next, justSent }: { email: string; next?: string; justSent: boolean }) {
  const t = useTranslations("authForms");
  const text = useMessageText();
  const [verifying, startVerify] = useTransition();
  const [resending, startResend] = useTransition();
  const [cooldown, setCooldown] = useState(justSent ? RESEND_COOLDOWN_SECONDS : 0);
  const [notice, setNotice] = useState<{ tone: "success" | "danger"; text: string } | null>(null);

  const form = useForm<VerifyOtpInput>({
    resolver: zodResolver(verifyOtpSchema),
    defaultValues: { email, token: "", next },
  });
  const { errors } = form.formState;

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const onSubmit = form.handleSubmit((values) => {
    if (verifying) return;
    setNotice(null);
    startVerify(async () => {
      const result = await verifyEmailOtpAction(values);
      if (result && !result.ok) applyActionErrors(form, result, ["email", "token"]);
    });
  });

  const resend = () => {
    const address = form.getValues("email");
    setNotice(null);
    startResend(async () => {
      const result = await resendVerificationCodeAction({ email: address });
      if (result.ok) {
        setNotice({ tone: "success", text: t("codeResent") });
        setCooldown(RESEND_COOLDOWN_SECONDS);
      } else {
        setNotice({ tone: "danger", text: text(`errors.${result.error.code}`) ?? "" });
        if (result.error.code === "rate_limited") setCooldown(RESEND_COOLDOWN_SECONDS);
      }
    });
  };

  return (
    <div className="space-y-6">
      {notice ? (
        <Alert tone={notice.tone} live>
          {notice.text}
        </Alert>
      ) : null}
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <FormError message={errors.root?.server?.message} />
        <FormField id="email" label={t("email")} error={errors.email?.message}>
          <Input type="email" autoComplete="email" inputMode="email" {...form.register("email")} />
        </FormField>
        <FormField id="token" label={t("code")} description={t("codeHint")} error={errors.token?.message}>
          <Input
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={6}
            className="text-center font-mono text-2xl tracking-[0.5em]"
            {...form.register("token")}
          />
        </FormField>
        <Button type="submit" size="lg" className="w-full" disabled={verifying}>
          {verifying ? <Spinner label={t("verifying")} /> : null}
          {t("verify")}
        </Button>
      </form>
      <div className="flex flex-col items-center gap-2 text-sm">
        <p className="text-muted-foreground">{t("noCode")}</p>
        <Button variant="secondary" onClick={resend} disabled={resending || cooldown > 0} aria-live="polite">
          {resending ? <Spinner label={t("sending")} /> : null}
          {cooldown > 0 ? t("resendIn", { seconds: cooldown }) : t("resendCode")}
        </Button>
      </div>
    </div>
  );
}

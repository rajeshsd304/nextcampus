"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Spinner } from "@/components/ui/misc";
import { FormError } from "@/features/auth/components/form-error";
import { useMessageText } from "@/i18n/use-message-text";
import { applyActionErrors } from "@/lib/forms";
import { submitContactAction } from "../actions";
import { CONTACT_TOPICS, contactSchema, type ContactInput } from "../schemas";

export function ContactForm({ defaultTopic }: { defaultTopic: ContactInput["topic"] }) {
  const t = useTranslations("contactForm");
  const text = useMessageText();
  const [pending, startTransition] = useTransition();
  const [sent, setSent] = useState<string | null>(null);
  const form = useForm<ContactInput>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: "", email: "", organization: "", topic: defaultTopic, message: "", website: "" },
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await submitContactAction(values);
      if (result.ok) {
        setSent(text(result.message) ?? t("sent"));
        form.reset();
      } else applyActionErrors(form, result, ["name", "email", "organization", "topic", "message"]);
    });
  });

  if (sent) {
    return (
      <Alert tone="success" title={t("sentTitle")} live>
        {sent}
      </Alert>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <FormError message={errors.root?.server?.message} />
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField id="contact-name" label={t("name")} error={errors.name?.message}>
          <Input autoComplete="name" {...form.register("name")} />
        </FormField>
        <FormField id="contact-email" label={t("email")} error={errors.email?.message}>
          <Input type="email" autoComplete="email" inputMode="email" {...form.register("email")} />
        </FormField>
        <FormField id="contact-org" label={t("organization")} optional error={errors.organization?.message}>
          <Input autoComplete="organization" {...form.register("organization")} />
        </FormField>
        <FormField id="contact-topic" label={t("topic")} error={errors.topic?.message}>
          <Select {...form.register("topic")}>
            {CONTACT_TOPICS.map((topic) => (
              <option key={topic} value={topic}>
                {t(`topics.${topic}`)}
              </option>
            ))}
          </Select>
        </FormField>
      </div>
      <FormField id="contact-message" label={t("message")} error={errors.message?.message}>
        <Textarea rows={6} {...form.register("message")} />
      </FormField>
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="contact-website">{t("honeypot")}</label>
        <input id="contact-website" tabIndex={-1} autoComplete="off" {...form.register("website")} />
      </div>
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? <Spinner label={t("sending")} /> : null}
        {t("submit")}
      </Button>
    </form>
  );
}

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input, Select } from "@/components/ui/input";
import { Spinner } from "@/components/ui/misc";
import { FormError } from "@/features/auth/components/form-error";
import { useMessageText } from "@/i18n/use-message-text";
import { applyActionErrors } from "@/lib/forms";
import { updateOrganizationAction } from "../actions";
import { ORGANIZATION_TYPES } from "../constants";
import { updateOrganizationSchema, type UpdateOrganizationInput } from "../schemas";

export function OrganizationSettingsForm({ defaults }: { defaults: UpdateOrganizationInput }) {
  const t = useTranslations("orgForms");
  const text = useMessageText();
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState<string | null>(null);
  const form = useForm<UpdateOrganizationInput>({
    resolver: zodResolver(updateOrganizationSchema),
    defaultValues: defaults,
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) => {
    setSaved(null);
    startTransition(async () => {
      const result = await updateOrganizationAction(values);
      if (result.ok) setSaved(text(result.message) ?? t("detailsSaved"));
      else applyActionErrors(form, result, ["name", "type", "website", "contactEmail"]);
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      {saved ? (
        <Alert tone="success" live>
          {saved}
        </Alert>
      ) : null}
      <FormError message={errors.root?.server?.message} />
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField id="org-name" label={t("name")} error={errors.name?.message}>
          <Input {...form.register("name")} />
        </FormField>
        <FormField id="org-type" label={t("type")} error={errors.type?.message}>
          <Select {...form.register("type")}>
            {ORGANIZATION_TYPES.map((type) => (
              <option key={type} value={type}>
                {t(`types.${type}`)}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField id="org-website" label={t("website")} optional error={errors.website?.message}>
          <Input type="url" inputMode="url" placeholder="https://" lang="en" {...form.register("website")} />
        </FormField>
        <FormField id="org-contact" label={t("contactEmail")} optional error={errors.contactEmail?.message}>
          <Input type="email" inputMode="email" {...form.register("contactEmail")} />
        </FormField>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? <Spinner label={t("saving")} /> : null}
        {t("save")}
      </Button>
    </form>
  );
}

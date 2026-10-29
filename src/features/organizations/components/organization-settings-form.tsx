"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input, Select } from "@/components/ui/input";
import { Spinner } from "@/components/ui/misc";
import { FormError } from "@/features/auth/components/form-error";
import { applyActionErrors } from "@/lib/forms";
import { updateOrganizationAction } from "../actions";
import { ORGANIZATION_TYPE_LABELS, ORGANIZATION_TYPES } from "../constants";
import { updateOrganizationSchema, type UpdateOrganizationInput } from "../schemas";

export function OrganizationSettingsForm({ defaults }: { defaults: UpdateOrganizationInput }) {
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
      if (result.ok) setSaved(result.message ?? "Saved.");
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
        <FormField id="org-name" label="Organization name" error={errors.name?.message}>
          <Input {...form.register("name")} />
        </FormField>
        <FormField id="org-type" label="Organization type" error={errors.type?.message}>
          <Select {...form.register("type")}>
            {ORGANIZATION_TYPES.map((type) => (
              <option key={type} value={type}>
                {ORGANIZATION_TYPE_LABELS[type]}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField id="org-website" label="Website" optional error={errors.website?.message}>
          <Input type="url" inputMode="url" placeholder="https://" {...form.register("website")} />
        </FormField>
        <FormField id="org-contact" label="Contact email" optional error={errors.contactEmail?.message}>
          <Input type="email" inputMode="email" {...form.register("contactEmail")} />
        </FormField>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? <Spinner label="Saving" /> : null}
        Save changes
      </Button>
    </form>
  );
}

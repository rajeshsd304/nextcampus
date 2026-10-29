"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input, Select } from "@/components/ui/input";
import { Spinner } from "@/components/ui/misc";
import { FormError } from "@/features/auth/components/form-error";
import { applyActionErrors } from "@/lib/forms";
import { slugify } from "@/lib/utils";
import { createOrganizationAction } from "../actions";
import { ORGANIZATION_TYPE_LABELS, ORGANIZATION_TYPES } from "../constants";
import { createOrganizationSchema, type CreateOrganizationInput } from "../schemas";

export function CreateOrganizationForm() {
  const [pending, startTransition] = useTransition();
  const [slugEdited, setSlugEdited] = useState(false);
  const form = useForm<CreateOrganizationInput>({
    resolver: zodResolver(createOrganizationSchema),
    defaultValues: { name: "", slug: "", type: "university" },
  });
  const { errors } = form.formState;
  const slug = useWatch({ control: form.control, name: "slug" });

  const nameField = form.register("name", {
    onChange: (event: { target: { value: string } }) => {
      if (!slugEdited) form.setValue("slug", slugify(event.target.value), { shouldValidate: false });
    },
  });
  const slugField = form.register("slug", { onChange: () => setSlugEdited(true) });

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await createOrganizationAction(values);
      if (result && !result.ok) applyActionErrors(form, result, ["name", "slug", "type"]);
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <FormError message={errors.root?.server?.message} />
      <FormField id="org-name" label="Organization name" error={errors.name?.message}>
        <Input autoComplete="organization" {...nameField} />
      </FormField>
      <FormField
        id="org-slug"
        label="Workspace address"
        description={
          <>
            Your workspace URL: <span className="text-foreground font-mono">/o/{slug || "your-org"}</span>
          </>
        }
        error={errors.slug?.message}
      >
        <Input autoCapitalize="none" spellCheck={false} {...slugField} />
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
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? <Spinner label="Creating workspace" /> : null}
        Create workspace
      </Button>
    </form>
  );
}

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input, Select } from "@/components/ui/input";
import { Spinner } from "@/components/ui/misc";
import { FormError } from "@/features/auth/components/form-error";
import { applyActionErrors } from "@/lib/forms";
import { completeOnboardingAction, updateProfileAction } from "../actions";
import { profileSettingsSchema, type ProfileSettingsInput } from "../schemas";

type Mode = { kind: "onboarding"; next?: string | undefined } | { kind: "settings" };

export function ProfileForm({
  mode,
  timeZones,
  defaults,
}: {
  mode: Mode;
  timeZones: string[];
  defaults: ProfileSettingsInput;
}) {
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState<string | null>(null);

  const form = useForm<ProfileSettingsInput>({
    resolver: zodResolver(profileSettingsSchema),
    defaultValues: defaults,
  });

  // Pre-select the browser's time zone during onboarding when none is stored yet.
  useEffect(() => {
    if (mode.kind !== "onboarding" || form.getValues("timezone") !== "UTC") return;
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (timeZones.includes(detected)) form.setValue("timezone", detected);
  }, [form, mode.kind, timeZones]);
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) => {
    setSaved(null);
    startTransition(async () => {
      const result =
        mode.kind === "onboarding"
          ? await completeOnboardingAction(
              { fullName: values.fullName, displayName: values.displayName, timezone: values.timezone },
              mode.next,
            )
          : await updateProfileAction(values);
      if (!result) return;
      if (result.ok) setSaved(result.message ?? "Saved.");
      else applyActionErrors(form, result, ["fullName", "displayName", "timezone"]);
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
        <FormField id="fullName" label="Full name" error={errors.fullName?.message}>
          <Input autoComplete="name" {...form.register("fullName")} />
        </FormField>
        <FormField
          id="displayName"
          label="Display name"
          optional
          description="Shown to others in your organizations."
          error={errors.displayName?.message}
        >
          <Input autoComplete="nickname" {...form.register("displayName")} />
        </FormField>
      </div>
      <FormField
        id="timezone"
        label="Time zone"
        description="Exam schedules and deadlines are shown in this time zone."
        error={errors.timezone?.message}
      >
        <Select {...form.register("timezone")}>
          {timeZones.map((tz) => (
            <option key={tz} value={tz}>
              {tz.replaceAll("_", " ")}
            </option>
          ))}
        </Select>
      </FormField>
      {mode.kind === "settings" ? (
        <div className="flex items-start gap-3">
          <input
            id="marketingOptIn"
            type="checkbox"
            className="border-input mt-0.5 size-4 rounded accent-indigo-600"
            {...form.register("marketingOptIn")}
          />
          <label htmlFor="marketingOptIn" className="text-muted-foreground text-sm">
            Send me occasional product updates from NextCampus.
          </label>
        </div>
      ) : null}
      <Button
        type="submit"
        size={mode.kind === "onboarding" ? "lg" : "md"}
        className={mode.kind === "onboarding" ? "w-full" : undefined}
        disabled={pending}
      >
        {pending ? <Spinner label="Saving" /> : null}
        {mode.kind === "onboarding" ? "Continue" : "Save changes"}
      </Button>
    </form>
  );
}

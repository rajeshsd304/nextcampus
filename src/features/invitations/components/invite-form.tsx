"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Copy } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input, Select } from "@/components/ui/input";
import { Spinner } from "@/components/ui/misc";
import { ASSIGNABLE_DISPLAY_ROLES, toOrgRole } from "@/features/access/roles";
import { emailSchema } from "@/features/auth/schemas";
import { FormError } from "@/features/auth/components/form-error";
import { applyActionErrors } from "@/lib/forms";
import { createInvitationAction, type CreatedInvitation } from "../actions";

/** UI-level schema: roles are offered as display roles and mapped on submit. */
const inviteFormSchema = z.object({
  email: emailSchema,
  role: z.enum(ASSIGNABLE_DISPLAY_ROLES, { error: "validation.roleRequired" }),
});
type InviteFormInput = z.input<typeof inviteFormSchema>;

export function InviteForm({ organizationId }: { organizationId: string }) {
  const t = useTranslations("invitationForms");
  const tRoles = useTranslations("roles");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [created, setCreated] = useState<CreatedInvitation | null>(null);
  const [copied, setCopied] = useState(false);
  const form = useForm<InviteFormInput>({
    resolver: zodResolver(inviteFormSchema),
    defaultValues: { email: "", role: "student" },
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) => {
    setCreated(null);
    setCopied(false);
    startTransition(async () => {
      const result = await createInvitationAction({
        organizationId,
        email: values.email,
        role: toOrgRole(values.role),
      });
      if (!result.ok) {
        applyActionErrors(form, result, ["email", "role"]);
        return;
      }
      setCreated(result.data);
      form.reset({ email: "", role: values.role });
      router.refresh();
    });
  });

  const copy = async () => {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.inviteUrl);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="space-y-4">
      {created ? (
        <Alert
          tone={created.emailSent ? "success" : "warning"}
          title={created.emailSent ? t("sent", { email: created.email }) : t("emailFailed")}
          live
        >
          <p className="mb-2">{t("linkOnce", { email: created.email })}</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              readOnly
              value={created.inviteUrl}
              aria-label={t("linkLabel")}
              className="h-11 font-mono text-xs lg:h-9"
            />
            <Button size="sm" variant="secondary" onClick={copy}>
              {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
              {copied ? t("copied") : t("copy")}
            </Button>
          </div>
        </Alert>
      ) : null}
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <FormError message={errors.root?.server?.message} />
        <div className="grid gap-4 sm:grid-cols-[1fr_14rem]">
          <FormField id="invite-email" label={t("email")} error={errors.email?.message}>
            <Input
              type="email"
              inputMode="email"
              autoComplete="off"
              placeholder={t("emailPlaceholder")}
              {...form.register("email")}
            />
          </FormField>
          <FormField id="invite-role" label={t("role")} error={errors.role?.message}>
            <Select {...form.register("role")}>
              {ASSIGNABLE_DISPLAY_ROLES.map((r) => (
                <option key={r} value={r}>
                  {tRoles(`${r}.label`)}
                </option>
              ))}
            </Select>
          </FormField>
        </div>
        <ul className="text-muted-foreground space-y-1 text-sm">
          {ASSIGNABLE_DISPLAY_ROLES.map((r) => (
            <li key={r}>
              <span className="text-foreground font-medium">{tRoles(`${r}.label`)}</span>
              {` — ${tRoles(`${r}.description`)}`}
            </li>
          ))}
        </ul>
        <Button type="submit" disabled={pending}>
          {pending ? <Spinner label={t("sending")} /> : null}
          {t("submit")}
        </Button>
      </form>
    </div>
  );
}

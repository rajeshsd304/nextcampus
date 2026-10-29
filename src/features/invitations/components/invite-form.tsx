"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Copy } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input, Select } from "@/components/ui/input";
import { Spinner } from "@/components/ui/misc";
import { ORG_ROLES, ROLE_DESCRIPTIONS, ROLE_LABELS } from "@/features/access/roles";
import { FormError } from "@/features/auth/components/form-error";
import { applyActionErrors } from "@/lib/forms";
import { createInvitationAction, type CreatedInvitation } from "../actions";
import { createInvitationSchema, type CreateInvitationInput } from "../schemas";

export function InviteForm({ organizationId }: { organizationId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [created, setCreated] = useState<{ invitation: CreatedInvitation; message: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const form = useForm<CreateInvitationInput>({
    resolver: zodResolver(createInvitationSchema),
    defaultValues: { organizationId, email: "", role: "student" },
  });
  const { errors } = form.formState;
  const role = useWatch({ control: form.control, name: "role" });

  const onSubmit = form.handleSubmit((values) => {
    setCreated(null);
    setCopied(false);
    startTransition(async () => {
      const result = await createInvitationAction(values);
      if (!result.ok) {
        applyActionErrors(form, result, ["email", "role"]);
        return;
      }
      setCreated({ invitation: result.data, message: result.message ?? "Invitation created." });
      form.reset({ organizationId, email: "", role: values.role });
      router.refresh();
    });
  });

  const copy = async () => {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.invitation.inviteUrl);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="space-y-4">
      {created ? (
        <Alert tone={created.invitation.emailSent ? "success" : "warning"} title={created.message} live>
          <p className="mb-2">This link is shown only once and works only for {created.invitation.email}.</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              readOnly
              value={created.invitation.inviteUrl}
              aria-label="Invitation link"
              className="h-9 font-mono text-xs"
            />
            <Button size="sm" variant="secondary" onClick={copy}>
              {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
              {copied ? "Copied" : "Copy link"}
            </Button>
          </div>
        </Alert>
      ) : null}
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <FormError message={errors.root?.server?.message} />
        <div className="grid gap-4 sm:grid-cols-[1fr_14rem]">
          <FormField id="invite-email" label="Email address" error={errors.email?.message}>
            <Input
              type="email"
              inputMode="email"
              autoComplete="off"
              placeholder="name@institution.edu"
              {...form.register("email")}
            />
          </FormField>
          <FormField id="invite-role" label="Role" error={errors.role?.message}>
            <Select {...form.register("role")}>
              {ORG_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </Select>
          </FormField>
        </div>
        <p className="text-muted-foreground text-sm">{ROLE_DESCRIPTIONS[role]}</p>
        <Button type="submit" disabled={pending}>
          {pending ? <Spinner label="Sending invitation" /> : null}
          Send invitation
        </Button>
      </form>
    </div>
  );
}

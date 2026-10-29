"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useMessageText } from "@/i18n/use-message-text";
import { leaveOrganizationAction } from "../actions";

export function LeaveOrganizationButton({
  organizationId,
  organizationName,
}: {
  organizationId: string;
  organizationName: string;
}) {
  const t = useTranslations("orgForms.members");
  const text = useMessageText();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col items-end gap-1">
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        trigger={
          <Button size="sm" variant="ghost" className="text-danger" disabled={pending}>
            {t("leave")}
          </Button>
        }
        title={t("leaveNamedTitle", { name: organizationName })}
        description={t("leaveNamedDescription")}
        confirmLabel={t("leaveConfirm")}
        onConfirm={() => {
          setOpen(false);
          setError(null);
          startTransition(async () => {
            const result = await leaveOrganizationAction({ organizationId });
            if (result.ok) router.refresh();
            else setError(text(`errors.${result.error.code}`) ?? null);
          });
        }}
      />
      <p aria-live="polite" className="text-danger text-xs font-medium">
        {error}
      </p>
    </div>
  );
}

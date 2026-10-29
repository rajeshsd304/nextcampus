"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useMessageText } from "@/i18n/use-message-text";
import { revokeInvitationAction } from "../actions";

export function RevokeInvitationButton({ invitationId, email }: { invitationId: string; email: string }) {
  const t = useTranslations("invitationForms.revoke");
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
            {t("button")}
          </Button>
        }
        title={t("title")}
        description={t("description", { email })}
        confirmLabel={t("confirm")}
        onConfirm={() => {
          setOpen(false);
          setError(null);
          startTransition(async () => {
            const result = await revokeInvitationAction({ invitationId });
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

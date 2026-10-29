"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useMessageText } from "@/i18n/use-message-text";
import { revokePlatformAdminAction } from "../actions";

export function RevokeAdminButton({ userId, name }: { userId: string; name: string }) {
  const t = useTranslations("platformAdmins");
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
          <Button
            size="sm"
            variant="ghost"
            className="text-danger"
            disabled={pending}
            aria-label={t("revokeNamed", { name })}
          >
            {t("revoke")}
          </Button>
        }
        title={t("revokeTitle", { name })}
        description={t("revokeDescription")}
        confirmLabel={t("revoke")}
        onConfirm={() => {
          setOpen(false);
          setError(null);
          startTransition(async () => {
            const result = await revokePlatformAdminAction({ userId });
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

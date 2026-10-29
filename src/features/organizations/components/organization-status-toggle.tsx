"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useMessageText } from "@/i18n/use-message-text";
import { setOrganizationStatusAction } from "../actions";

export function OrganizationStatusToggle({
  organizationId,
  organizationName,
  status,
}: {
  organizationId: string;
  organizationName: string;
  status: "active" | "suspended";
}) {
  const t = useTranslations("orgForms.status");
  const text = useMessageText();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const nextStatus = status === "active" ? "suspended" : "active";

  const apply = () => {
    setOpen(false);
    setError(null);
    startTransition(async () => {
      const result = await setOrganizationStatusAction({ organizationId, status: nextStatus });
      if (result.ok) router.refresh();
      else setError(text(`errors.${result.error.code}`) ?? null);
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      {status === "active" ? (
        <ConfirmDialog
          open={open}
          onOpenChange={setOpen}
          trigger={
            <Button size="sm" variant="ghost" className="text-danger" disabled={pending}>
              {t("suspend")}
            </Button>
          }
          title={t("suspendTitle", { name: organizationName })}
          description={t("suspendDescription")}
          confirmLabel={t("suspendConfirm")}
          onConfirm={apply}
        />
      ) : (
        <Button size="sm" variant="secondary" onClick={apply} disabled={pending}>
          {t("reactivate")}
        </Button>
      )}
      <p aria-live="polite" className="text-danger text-xs font-medium">
        {error}
      </p>
    </div>
  );
}

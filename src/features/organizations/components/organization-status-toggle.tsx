"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
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
      else setError(result.error.message);
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
              Suspend
            </Button>
          }
          title={`Suspend ${organizationName}?`}
          description="Members keep their accounts but lose all organization permissions until it is reactivated."
          confirmLabel="Suspend organization"
          onConfirm={apply}
        />
      ) : (
        <Button size="sm" variant="secondary" onClick={apply} disabled={pending}>
          Reactivate
        </Button>
      )}
      <p aria-live="polite" className="text-danger text-xs font-medium">
        {error}
      </p>
    </div>
  );
}

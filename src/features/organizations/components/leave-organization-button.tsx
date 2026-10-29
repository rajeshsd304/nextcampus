"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { leaveOrganizationAction } from "../actions";

export function LeaveOrganizationButton({
  organizationId,
  organizationName,
}: {
  organizationId: string;
  organizationName: string;
}) {
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
            Leave
          </Button>
        }
        title={`Leave ${organizationName}?`}
        description="You will lose access to this organization immediately. An administrator can invite you again."
        confirmLabel="Leave organization"
        onConfirm={() => {
          setOpen(false);
          setError(null);
          startTransition(async () => {
            const result = await leaveOrganizationAction({ organizationId });
            if (result.ok) router.refresh();
            else setError(result.error.message);
          });
        }}
      />
      <p aria-live="polite" className="text-danger text-xs font-medium">
        {error}
      </p>
    </div>
  );
}

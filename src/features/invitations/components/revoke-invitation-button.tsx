"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { revokeInvitationAction } from "../actions";

export function RevokeInvitationButton({ invitationId, email }: { invitationId: string; email: string }) {
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
            Revoke
          </Button>
        }
        title="Revoke invitation?"
        description={`The invitation link sent to ${email} will stop working immediately.`}
        confirmLabel="Revoke invitation"
        onConfirm={() => {
          setOpen(false);
          setError(null);
          startTransition(async () => {
            const result = await revokeInvitationAction({ invitationId });
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

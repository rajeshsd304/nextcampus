"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/misc";
import {
  acceptInvitationByIdAction,
  acceptInvitationByTokenAction,
  declineInvitationAction,
} from "../actions";

type Target = { kind: "token"; token: string } | { kind: "id"; invitationId: string };

/** Accept / decline controls for an invitation addressed to the current user. */
export function InvitationResponse({
  target,
  allowDecline = target.kind === "id",
}: {
  target: Target;
  allowDecline?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [declined, setDeclined] = useState(false);

  const accept = () => {
    setError(null);
    startTransition(async () => {
      const result =
        target.kind === "token"
          ? await acceptInvitationByTokenAction({ token: target.token })
          : await acceptInvitationByIdAction({ invitationId: target.invitationId });
      if (result && !result.ok) setError(result.error.message);
    });
  };

  const decline = () => {
    if (target.kind !== "id") return;
    setError(null);
    startTransition(async () => {
      const result = await declineInvitationAction({ invitationId: target.invitationId });
      if (result.ok) {
        setDeclined(true);
        router.refresh();
      } else setError(result.error.message);
    });
  };

  if (declined)
    return (
      <p className="text-muted-foreground text-sm" role="status">
        Invitation declined.
      </p>
    );

  return (
    <div className="space-y-3">
      {error ? (
        <Alert tone="danger" live>
          {error}
        </Alert>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button onClick={accept} disabled={pending}>
          {pending ? <Spinner label="Working" /> : null}
          Accept invitation
        </Button>
        {allowDecline ? (
          <Button variant="secondary" onClick={decline} disabled={pending}>
            Decline
          </Button>
        ) : null}
      </div>
    </div>
  );
}

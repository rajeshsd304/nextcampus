"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/misc";
import { useMessageText } from "@/i18n/use-message-text";
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
  const t = useTranslations("invitationForms.response");
  const text = useMessageText();
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
      if (result && !result.ok) setError(text(`errors.${result.error.code}`) ?? null);
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
      } else setError(text(`errors.${result.error.code}`) ?? null);
    });
  };

  if (declined) {
    return (
      <p className="text-muted-foreground text-sm" role="status">
        {t("declined")}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {error ? (
        <Alert tone="danger" live>
          {error}
        </Alert>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button onClick={accept} disabled={pending}>
          {pending ? <Spinner label={t("working")} /> : null}
          {t("accept")}
        </Button>
        {allowDecline ? (
          <Button variant="secondary" onClick={decline} disabled={pending}>
            {t("decline")}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useId, useState, useTransition } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label, Textarea } from "@/components/ui/input";
import { Spinner } from "@/components/ui/misc";
import { useMessageText } from "@/i18n/use-message-text";
import { transitionQuestionAction } from "../actions";
import { ACTION_FROM, QUESTION_ACTIONS, type QuestionAction, type QuestionStatus } from "../constants";
import type { BankRef } from "../server/context";

/** Actions a reviewer must explain (reject: required; archive: optional). */
const NEEDS_REASON = ["reject", "archive"] as const;
type ReasonAction = (typeof NEEDS_REASON)[number];

function needsReason(action: QuestionAction): action is ReasonAction {
  return (NEEDS_REASON as readonly string[]).includes(action);
}

export function TransitionControls({
  bank,
  questionId,
  status,
  canEdit,
  canReview,
  isCreator,
}: {
  bank: BankRef;
  questionId: string;
  status: QuestionStatus;
  canEdit: boolean;
  canReview: boolean;
  isCreator: boolean;
}) {
  const t = useTranslations("questionForms.transitions");
  const text = useMessageText();
  const router = useRouter();
  const reasonId = useId();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const [dialog, setDialog] = useState<ReasonAction | null>(null);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState<string | null>(null);

  const allowed = QUESTION_ACTIONS.filter((action) => {
    if (ACTION_FROM[action] !== status) return false;
    if (action === "submit") return canEdit;
    if (action === "withdraw") return canReview || isCreator;
    return canReview;
  });

  const run = (action: QuestionAction, why: string) => {
    setMessage(null);
    startTransition(async () => {
      const result = await transitionQuestionAction({ bank, questionId, action, reason: why });
      if (result.ok) {
        setDialog(null);
        setReason("");
        setMessage({ tone: "success", text: text(result.message) ?? "" });
        router.refresh();
      } else if (result.error.fieldErrors?.reason) {
        setReasonError(text(result.error.fieldErrors.reason[0]) ?? null);
      } else {
        setDialog(null);
        setMessage({ tone: "danger", text: text(`errors.${result.error.code}`) ?? "" });
      }
    });
  };

  if (allowed.length === 0) return null;

  return (
    <div className="space-y-3">
      {message ? (
        <Alert tone={message.tone} live>
          {message.text}
        </Alert>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {allowed.map((action) =>
          needsReason(action) ? (
            <Button
              key={action}
              variant={action === "reject" ? "danger" : "secondary"}
              disabled={pending}
              onClick={() => {
                setReason("");
                setReasonError(null);
                setDialog(action);
              }}
            >
              {t(`actions.${action}`)}
            </Button>
          ) : (
            <Button
              key={action}
              variant={action === "publish" || action === "submit" ? "primary" : "secondary"}
              disabled={pending}
              onClick={() => run(action, "")}
            >
              {pending ? <Spinner label={t("working")} /> : null}
              {t(`actions.${action}`)}
            </Button>
          ),
        )}
      </div>

      <DialogPrimitive.Root open={dialog !== null} onOpenChange={(open) => (open ? null : setDialog(null))}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="bg-navy-950/50 fixed inset-0 z-50 backdrop-blur-sm" />
          <DialogPrimitive.Content className="border-border bg-surface fixed top-1/2 left-1/2 z-50 w-[min(32rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-2xl border p-6 shadow-2xl">
            <DialogPrimitive.Title className="text-lg font-semibold">
              {dialog ? t(`dialogs.${dialog}.title`) : null}
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="text-muted-foreground mt-2 text-sm">
              {dialog ? t(`dialogs.${dialog}.description`) : null}
            </DialogPrimitive.Description>
            <form
              className="mt-4 space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                if (!dialog) return;
                if (dialog === "reject" && reason.trim().length < 3) {
                  setReasonError(text("validation.reasonRequired") ?? null);
                  return;
                }
                run(dialog, reason.trim());
              }}
            >
              <div className="space-y-1.5">
                <Label htmlFor={reasonId}>
                  {dialog === "reject" ? t("reasonRequired") : t("reasonOptional")}
                </Label>
                <Textarea
                  id={reasonId}
                  rows={4}
                  maxLength={1000}
                  value={reason}
                  required={dialog === "reject"}
                  aria-invalid={reasonError ? true : undefined}
                  aria-describedby={reasonError ? `${reasonId}-error` : undefined}
                  onChange={(event) => setReason(event.target.value)}
                />
                {reasonError ? (
                  <p id={`${reasonId}-error`} className="text-danger text-sm font-medium">
                    {reasonError}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <DialogPrimitive.Close asChild>
                  <Button variant="secondary">{t("cancel")}</Button>
                </DialogPrimitive.Close>
                <Button type="submit" variant={dialog === "reject" ? "danger" : "primary"} disabled={pending}>
                  {pending ? <Spinner label={t("working")} /> : null}
                  {dialog ? t(`actions.${dialog}`) : null}
                </Button>
              </div>
            </form>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </div>
  );
}

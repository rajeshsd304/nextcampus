"use client";

import { GraduationCap } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Spinner } from "@/components/ui/misc";
import { useMessageText } from "@/i18n/use-message-text";
import { joinPublicOrganizationAction } from "../actions";

export function JoinPublicButton({
  variant = "primary",
  size = "lg",
}: Pick<ButtonProps, "variant" | "size">) {
  const t = useTranslations("orgForms.joinPublic");
  const text = useMessageText();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <Button
        variant={variant}
        size={size}
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await joinPublicOrganizationAction();
            if (result && !result.ok) setError(text(`errors.${result.error.code}`) ?? null);
          })
        }
      >
        {pending ? <Spinner label={t("joining")} /> : <GraduationCap aria-hidden="true" />}
        {t("button")}
      </Button>
      <p aria-live="polite" className="text-danger text-sm font-medium">
        {error}
      </p>
    </div>
  );
}

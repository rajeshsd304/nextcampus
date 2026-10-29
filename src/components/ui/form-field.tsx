import { useTranslations } from "next-intl";
import { cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { useMessageText } from "@/i18n/use-message-text";
import { cn } from "@/lib/utils";
import { Label } from "./input";

type FieldControlProps = {
  id?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
};

/**
 * Accessible label + control + description + error wiring. The control
 * receives id, aria-invalid and aria-describedby automatically. `error` may be
 * a message key (e.g. from a Zod schema); it is translated here.
 */
export function FormField({
  id,
  label,
  description,
  error,
  className,
  optional,
  children,
}: {
  id: string;
  label: ReactNode;
  description?: ReactNode;
  error?: string | undefined;
  className?: string;
  optional?: boolean;
  children: ReactElement<FieldControlProps>;
}) {
  const t = useTranslations("common");
  const text = useMessageText();
  const errorText = text(error);
  const descriptionId = description ? `${id}-description` : undefined;
  const errorId = errorText ? `${id}-error` : undefined;
  const describedBy = [descriptionId, errorId].filter(Boolean).join(" ") || undefined;

  const control = isValidElement(children)
    ? cloneElement(children, {
        id,
        "aria-invalid": errorText ? true : undefined,
        "aria-describedby": describedBy,
      })
    : children;

  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id}>
        {label}
        {optional ? <span className="text-muted-foreground ml-1 font-normal">{t("optional")}</span> : null}
      </Label>
      {control}
      {description ? (
        <p id={descriptionId} className="text-muted-foreground text-sm">
          {description}
        </p>
      ) : null}
      {errorText ? (
        <p id={errorId} className="text-danger text-sm font-medium">
          {errorText}
        </p>
      ) : null}
    </div>
  );
}

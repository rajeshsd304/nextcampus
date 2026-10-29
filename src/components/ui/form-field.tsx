import { cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Label } from "./input";

type FieldControlProps = {
  id?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
};

/**
 * Accessible label + control + description + error wiring. The control
 * receives id, aria-invalid and aria-describedby automatically.
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
  const descriptionId = description ? `${id}-description` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [descriptionId, errorId].filter(Boolean).join(" ") || undefined;

  const control = isValidElement(children)
    ? cloneElement(children, {
        id,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": describedBy,
      })
    : children;

  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id}>
        {label}
        {optional ? <span className="text-muted-foreground ml-1 font-normal">(optional)</span> : null}
      </Label>
      {control}
      {description ? (
        <p id={descriptionId} className="text-muted-foreground text-sm">
          {description}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-danger text-sm font-medium">
          {error}
        </p>
      ) : null}
    </div>
  );
}

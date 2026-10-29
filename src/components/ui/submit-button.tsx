"use client";

import { useFormStatus } from "react-dom";
import { Button, type ButtonProps } from "./button";
import { Spinner } from "./misc";

/** Submit button for plain `<form action={serverAction}>` forms. */
export function SubmitButton({ children, pendingLabel, ...props }: ButtonProps & { pendingLabel?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || props.disabled} aria-disabled={pending} {...props}>
      {pending ? <Spinner label={pendingLabel ?? "Working"} /> : null}
      {children}
    </Button>
  );
}

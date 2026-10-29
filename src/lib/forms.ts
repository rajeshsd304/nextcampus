import type { FieldValues, Path, UseFormReturn } from "react-hook-form";
import type { ActionResult } from "./action-result";

/** Copies server-side validation/authorization errors onto a React Hook Form instance. */
export function applyActionErrors<T extends FieldValues>(
  form: UseFormReturn<T>,
  result: ActionResult<unknown>,
  fields: readonly Path<T>[],
): void {
  if (result.ok) return;
  let fieldErrorApplied = false;
  for (const [key, messages] of Object.entries(result.error.fieldErrors ?? {})) {
    const message = messages?.[0];
    const field = fields.find((name) => name === key);
    if (field && message) {
      form.setError(field, { type: "server", message });
      fieldErrorApplied = true;
    }
  }
  form.setError("root.server", {
    type: "server",
    message: fieldErrorApplied ? "Please correct the highlighted fields." : result.error.message,
  });
}

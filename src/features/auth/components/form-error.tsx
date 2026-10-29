import { Alert } from "@/components/ui/alert";
import { useMessageText } from "@/i18n/use-message-text";

/** Form-level error. `message` is a translation key (e.g. `errors.not_authorized`). */
export function FormError({ message }: { message?: string | undefined }) {
  const text = useMessageText();
  const content = text(message);
  if (!content) return null;
  return (
    <Alert tone="danger" live>
      {content}
    </Alert>
  );
}

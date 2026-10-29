import { Alert } from "@/components/ui/alert";

export function FormError({ message }: { message?: string | undefined }) {
  if (!message) return null;
  return (
    <Alert tone="danger" live>
      {message}
    </Alert>
  );
}

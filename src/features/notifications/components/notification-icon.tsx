import { Bell, Building2, Mail, ShieldCheck } from "lucide-react";
import type { Enums } from "@/types/database";

const icons = { invitation: Mail, membership: Building2, security: ShieldCheck, system: Bell } as const;

export function NotificationIcon({ kind }: { kind: Enums<"notification_kind"> }) {
  const Icon = icons[kind];
  return (
    <span className="bg-accent text-accent-foreground flex size-9 shrink-0 items-center justify-center rounded-xl">
      <Icon className="size-4" aria-hidden="true" />
    </span>
  );
}

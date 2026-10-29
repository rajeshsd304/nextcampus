import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const tones = {
  info: {
    icon: Info,
    classes:
      "border-indigo-200 bg-indigo-50 text-indigo-950 dark:border-indigo-900 dark:bg-indigo-950/50 dark:text-indigo-100",
  },
  success: {
    icon: CheckCircle2,
    classes:
      "border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100",
  },
  warning: {
    icon: AlertTriangle,
    classes:
      "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-100",
  },
  danger: {
    icon: XCircle,
    classes: "border-red-200 bg-red-50 text-red-950 dark:border-red-900 dark:bg-red-950/50 dark:text-red-100",
  },
} as const;

export function Alert({
  tone = "info",
  title,
  children,
  className,
  live,
}: {
  tone?: keyof typeof tones;
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
  /** Announce to assistive technology when the alert appears. */
  live?: boolean;
}) {
  const { icon: Icon, classes } = tones[tone];
  return (
    <div
      role={live ? (tone === "danger" ? "alert" : "status") : undefined}
      className={cn("flex gap-3 rounded-xl border p-4 text-sm", classes, className)}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div className="space-y-1">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className="leading-relaxed">{children}</div> : null}
      </div>
    </div>
  );
}

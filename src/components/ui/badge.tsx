import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold", {
  variants: {
    tone: {
      neutral: "bg-surface-muted text-muted-foreground",
      indigo: "bg-accent text-accent-foreground",
      success: "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
      warning: "bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
      danger: "bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-300",
    },
  },
  defaultVariants: { tone: "neutral" },
});

export function Badge({
  className,
  tone,
  ...props
}: ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

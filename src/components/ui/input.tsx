import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const fieldClasses =
  "block w-full rounded-xl border border-input bg-surface px-3.5 text-base text-foreground shadow-xs placeholder:text-muted-foreground/80 focus-visible:border-ring focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-ring/40 disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:border-danger sm:text-sm";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(fieldClasses, "h-11", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(fieldClasses, "min-h-32 py-2.5", className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cn(fieldClasses, "h-11 pr-9", className)} {...props} />;
}

export function Label({ className, ...props }: ComponentProps<"label">) {
  return <label className={cn("text-foreground text-sm font-medium", className)} {...props} />;
}

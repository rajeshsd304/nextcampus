"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;

/** Slide-in panel (used for mobile navigation). Focus is trapped and restored by Radix. */
export function SheetContent({
  className,
  title,
  description,
  children,
  side = "left",
  ...props
}: ComponentProps<typeof DialogPrimitive.Content> & {
  title: string;
  description?: string;
  side?: "left" | "right";
  children: ReactNode;
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="bg-navy-950/50 fixed inset-0 z-50 backdrop-blur-sm" />
      <DialogPrimitive.Content
        className={cn(
          "border-border bg-surface fixed inset-y-0 z-50 flex w-[min(20rem,88vw)] flex-col gap-4 overflow-y-auto p-5 shadow-2xl",
          side === "left" ? "left-0 border-r" : "right-0 border-l",
          className,
        )}
        {...props}
      >
        <div className="flex items-center justify-between">
          <DialogPrimitive.Title className="text-base font-semibold">{title}</DialogPrimitive.Title>
          <DialogPrimitive.Close className="hover:bg-surface-muted rounded-lg p-2" aria-label="Close menu">
            <X className="size-5" aria-hidden="true" />
          </DialogPrimitive.Close>
        </div>
        {description ? (
          <DialogPrimitive.Description className="sr-only">{description}</DialogPrimitive.Description>
        ) : (
          <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>
        )}
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

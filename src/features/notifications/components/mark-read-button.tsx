"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { markNotificationsReadAction } from "../actions";

export function MarkReadButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await markNotificationsReadAction({ ids: [id] });
          router.refresh();
        })
      }
    >
      Mark read
    </Button>
  );
}

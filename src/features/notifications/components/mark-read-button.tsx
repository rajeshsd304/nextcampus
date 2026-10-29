"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { markNotificationsReadAction } from "../actions";

export function MarkReadButton({ id }: { id: string }) {
  const t = useTranslations("notifications");
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
      {t("markRead")}
    </Button>
  );
}

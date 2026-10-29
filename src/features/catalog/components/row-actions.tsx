"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useMessageText } from "@/i18n/use-message-text";
import { deleteCatalogItemAction, moveCatalogItemAction, setCatalogActiveAction } from "../actions";
import type { CatalogEntity } from "../types";

export function CatalogRowActions({
  entity,
  id,
  name,
  active,
  editHref,
  isFirst,
  isLast,
}: {
  entity: CatalogEntity;
  id: string;
  name: string;
  active: boolean;
  editHref: string;
  isFirst: boolean;
  isLast: boolean;
}) {
  const t = useTranslations("catalogAdmin.row");
  const text = useMessageText();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);

  const run = (action: () => Promise<{ ok: boolean; error?: { code: string } }>) => {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.ok) router.refresh();
      else setError(text(`errors.${result.error?.code ?? "unexpected"}`) ?? null);
    });
  };

  return (
    <div className="flex flex-col items-stretch gap-1 sm:items-end">
      <div className="flex flex-wrap items-center gap-1">
        <Button
          size="icon"
          variant="ghost"
          aria-label={t("moveUp", { name })}
          disabled={pending || isFirst}
          onClick={() => run(() => moveCatalogItemAction({ entity, id, direction: "up" }))}
        >
          <ArrowUp aria-hidden="true" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          aria-label={t("moveDown", { name })}
          disabled={pending || isLast}
          onClick={() => run(() => moveCatalogItemAction({ entity, id, direction: "down" }))}
        >
          <ArrowDown aria-hidden="true" />
        </Button>
        <Button asChild size="sm" variant="secondary">
          <Link href={editHref} aria-label={t("editNamed", { name })}>
            {t("edit")}
          </Link>
        </Button>
        {active ? (
          <ConfirmDialog
            open={confirmDeactivate}
            onOpenChange={setConfirmDeactivate}
            trigger={
              <Button
                size="sm"
                variant="ghost"
                disabled={pending}
                aria-label={t("deactivateNamed", { name })}
              >
                {t("deactivate")}
              </Button>
            }
            title={t("deactivateTitle", { name })}
            description={t("deactivateDescription")}
            confirmLabel={t("deactivate")}
            onConfirm={() => {
              setConfirmDeactivate(false);
              run(() => setCatalogActiveAction({ entity, id, active: false }));
            }}
          />
        ) : (
          <Button
            size="sm"
            variant="ghost"
            disabled={pending}
            aria-label={t("activateNamed", { name })}
            onClick={() => run(() => setCatalogActiveAction({ entity, id, active: true }))}
          >
            {t("activate")}
          </Button>
        )}
        <ConfirmDialog
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          trigger={
            <Button
              size="sm"
              variant="ghost"
              className="text-danger"
              disabled={pending}
              aria-label={t("deleteNamed", { name })}
            >
              {t("delete")}
            </Button>
          }
          title={t("deleteTitle", { name })}
          description={t("deleteDescription")}
          confirmLabel={t("delete")}
          onConfirm={() => {
            setConfirmDelete(false);
            run(() => deleteCatalogItemAction({ entity, id }));
          }}
        />
      </div>
      <p aria-live="polite" className="text-danger text-xs font-medium">
        {error}
      </p>
    </div>
  );
}

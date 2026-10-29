"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useId, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Select } from "@/components/ui/input";
import { Spinner } from "@/components/ui/misc";
import {
  ASSIGNABLE_DISPLAY_ROLES,
  ORG_ROLE_DISPLAY,
  toOrgRole,
  type AssignableDisplayRole,
  type OrgRole,
} from "@/features/access/roles";
import { useMessageText } from "@/i18n/use-message-text";
import { removeMemberAction, updateMemberRoleAction } from "../actions";

export function MemberControls({
  organizationId,
  userId,
  role,
  memberName,
  isSelf,
}: {
  organizationId: string;
  userId: string;
  role: OrgRole;
  memberName: string;
  isSelf: boolean;
}) {
  const t = useTranslations("orgForms.members");
  const tRoles = useTranslations("roles");
  const text = useMessageText();
  const router = useRouter();
  const selectId = useId();
  const currentDisplay = ORG_ROLE_DISPLAY[role];
  const [selected, setSelected] = useState<AssignableDisplayRole>(currentDisplay);
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const saveRole = () => {
    setMessage(null);
    startTransition(async () => {
      const result = await updateMemberRoleAction({
        organizationId,
        userId,
        role: toOrgRole(selected, role),
      });
      if (result.ok) {
        setMessage({ tone: "success", text: text(result.message) ?? "" });
        router.refresh();
      } else {
        setMessage({ tone: "error", text: text(`errors.${result.error.code}`) ?? "" });
        setSelected(currentDisplay);
      }
    });
  };

  const remove = () => {
    setConfirmOpen(false);
    setMessage(null);
    startTransition(async () => {
      const result = await removeMemberAction({ organizationId, userId });
      if (result.ok) router.refresh();
      else setMessage({ tone: "error", text: text(`errors.${result.error.code}`) ?? "" });
    });
  };

  return (
    <div className="flex flex-col items-stretch gap-2 sm:items-end">
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={selectId} className="sr-only">
          {t("roleFor", { name: memberName })}
        </label>
        <Select
          id={selectId}
          value={selected}
          onChange={(event) => setSelected(event.target.value as AssignableDisplayRole)}
          className="h-11 w-auto min-w-44 lg:h-9"
          disabled={pending}
        >
          {ASSIGNABLE_DISPLAY_ROLES.map((r) => (
            <option key={r} value={r}>
              {tRoles(`${r}.label`)}
            </option>
          ))}
        </Select>
        <Button
          size="sm"
          variant="secondary"
          onClick={saveRole}
          disabled={pending || selected === currentDisplay}
        >
          {pending ? <Spinner label={t("saving")} /> : null}
          {t("save")}
        </Button>
        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          trigger={
            <Button size="sm" variant="ghost" className="text-danger" disabled={pending}>
              {isSelf ? t("leave") : t("remove")}
            </Button>
          }
          title={isSelf ? t("leaveTitle") : t("removeTitle", { name: memberName })}
          description={isSelf ? t("leaveDescription") : t("removeDescription")}
          confirmLabel={isSelf ? t("leaveConfirm") : t("removeConfirm")}
          onConfirm={remove}
        />
      </div>
      <p
        aria-live="polite"
        className={message?.tone === "error" ? "text-danger text-xs font-medium" : "text-success text-xs"}
      >
        {message?.text}
      </p>
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Select } from "@/components/ui/input";
import { Spinner } from "@/components/ui/misc";
import { ORG_ROLES, ROLE_LABELS, type OrgRole } from "@/features/access/roles";
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
  const router = useRouter();
  const selectId = useId();
  const [selected, setSelected] = useState<OrgRole>(role);
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const saveRole = () => {
    setMessage(null);
    startTransition(async () => {
      const result = await updateMemberRoleAction({ organizationId, userId, role: selected });
      if (result.ok) {
        setMessage({ tone: "success", text: result.message ?? "Saved." });
        router.refresh();
      } else {
        setMessage({ tone: "error", text: result.error.message });
        setSelected(role);
      }
    });
  };

  const remove = () => {
    setConfirmOpen(false);
    setMessage(null);
    startTransition(async () => {
      const result = await removeMemberAction({ organizationId, userId });
      if (result.ok) router.refresh();
      else setMessage({ tone: "error", text: result.error.message });
    });
  };

  return (
    <div className="flex flex-col items-stretch gap-2 sm:items-end">
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={selectId} className="sr-only">
          Role for {memberName}
        </label>
        <Select
          id={selectId}
          value={selected}
          onChange={(event) => setSelected(event.target.value as OrgRole)}
          className="h-9 w-auto min-w-44"
          disabled={pending}
        >
          {ORG_ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </Select>
        <Button size="sm" variant="secondary" onClick={saveRole} disabled={pending || selected === role}>
          {pending ? <Spinner label="Saving" /> : null}
          Save
        </Button>
        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          trigger={
            <Button size="sm" variant="ghost" className="text-danger" disabled={pending}>
              {isSelf ? "Leave" : "Remove"}
            </Button>
          }
          title={isSelf ? "Leave this organization?" : `Remove ${memberName}?`}
          description={
            isSelf
              ? "You will lose access to this organization immediately."
              : "They will lose access to this organization immediately. You can invite them again later."
          }
          confirmLabel={isSelf ? "Leave organization" : "Remove member"}
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

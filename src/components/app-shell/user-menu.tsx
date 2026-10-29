"use client";

import { Bell, Building2, LogOut, ShieldCheck, User } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { Avatar } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOutAction } from "@/features/auth/actions";

export function UserMenu({
  name,
  email,
  avatarUrl,
  isSuperAdmin,
}: {
  name: string;
  email: string;
  avatarUrl: string | null;
  isSuperAdmin: boolean;
}) {
  const t = useTranslations("shell.userMenu");
  const [pending, startTransition] = useTransition();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="ml-0.5 flex size-11 items-center justify-center rounded-full"
        aria-label={t("label", { name })}
      >
        <Avatar name={name} src={avatarUrl} size="sm" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="text-foreground">
          <span className="block truncate text-sm font-semibold">{name}</span>
          <span className="text-muted-foreground block truncate text-xs font-normal">{email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <User aria-hidden="true" />
            {t("settings")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings/organizations">
            <Building2 aria-hidden="true" />
            {t("organizations")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/notifications">
            <Bell aria-hidden="true" />
            {t("notifications")}
          </Link>
        </DropdownMenuItem>
        {isSuperAdmin ? (
          <DropdownMenuItem asChild>
            <Link href="/platform">
              <ShieldCheck aria-hidden="true" />
              {t("platform")}
            </Link>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={pending} onSelect={() => startTransition(() => signOutAction())}>
          <LogOut aria-hidden="true" />
          {pending ? t("signingOut") : t("signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

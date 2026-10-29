"use client";

import { Bell, Building2, LogOut, ShieldCheck, User } from "lucide-react";
import Link from "next/link";
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
  const [pending, startTransition] = useTransition();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="ml-1 rounded-full" aria-label={`Account menu for ${name}`}>
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
            Account settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings/organizations">
            <Building2 aria-hidden="true" />
            Organizations
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/notifications">
            <Bell aria-hidden="true" />
            Notifications
          </Link>
        </DropdownMenuItem>
        {isSuperAdmin ? (
          <DropdownMenuItem asChild>
            <Link href="/platform">
              <ShieldCheck aria-hidden="true" />
              Platform console
            </Link>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={pending} onSelect={() => startTransition(() => signOutAction())}>
          <LogOut aria-hidden="true" />
          {pending ? "Signing out…" : "Sign out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

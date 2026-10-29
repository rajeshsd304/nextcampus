"use client";

import { Building2, Check, ChevronsUpDown, Mail, Plus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ROLE_LABELS, type OrgRole } from "@/features/access/roles";

export type WorkspaceOption = { slug: string; name: string; role: OrgRole; suspended: boolean };

export function OrgSwitcher({ workspaces }: { workspaces: WorkspaceOption[] }) {
  const pathname = usePathname();
  const currentSlug = /^\/o\/([^/]+)/.exec(pathname)?.[1];
  const current = workspaces.find((w) => w.slug === currentSlug);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="hover:bg-surface-muted flex min-w-0 items-center gap-2 rounded-xl px-2.5 py-1.5 text-left">
        <Building2 className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
        <span className="min-w-0">
          <span className="sr-only">Current workspace: </span>
          <span className="block max-w-[9rem] truncate text-sm font-semibold sm:max-w-[16rem]">
            {current?.name ?? "Select workspace"}
          </span>
          {current ? (
            <span className="text-muted-foreground hidden text-xs sm:block">{ROLE_LABELS[current.role]}</span>
          ) : null}
        </span>
        <ChevronsUpDown className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuLabel>Your workspaces</DropdownMenuLabel>
        {workspaces.length === 0 ? (
          <p className="text-muted-foreground px-2.5 pb-2 text-sm">
            You are not a member of any organization yet.
          </p>
        ) : (
          workspaces.map((w) => (
            <DropdownMenuItem key={w.slug} asChild>
              <Link href={`/o/${w.slug}`} aria-current={w.slug === currentSlug ? "true" : undefined}>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{w.name}</span>
                  <span className="text-muted-foreground block text-xs">
                    {ROLE_LABELS[w.role]}
                    {w.suspended ? " · Suspended" : ""}
                  </span>
                </span>
                {w.slug === currentSlug ? <Check aria-hidden="true" /> : null}
              </Link>
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/invitations">
            <Mail aria-hidden="true" />
            Pending invitations
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/onboarding/organization">
            <Plus aria-hidden="true" />
            Create an organization
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

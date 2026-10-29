"use client";

import { Building2, Check, ChevronsUpDown, GraduationCap, Mail, Plus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { DisplayRole } from "@/features/access/roles";

export type WorkspaceOption = {
  slug: string;
  name: string;
  displayRole: Exclude<DisplayRole, "platformAdmin">;
  isPublic: boolean;
  suspended: boolean;
};

export function OrgSwitcher({ workspaces }: { workspaces: WorkspaceOption[] }) {
  const t = useTranslations("shell.orgSwitcher");
  const tRoles = useTranslations("roles");
  const pathname = usePathname();
  const currentSlug = /^\/o\/([^/]+)/.exec(pathname)?.[1];
  const current = workspaces.find((w) => w.slug === currentSlug);
  // Public practice first, then institutions.
  const ordered = [...workspaces].sort((a, b) => Number(b.isPublic) - Number(a.isPublic));

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="hover:bg-surface-muted flex min-h-11 min-w-0 items-center gap-2 rounded-xl px-2 py-1 text-left sm:px-2.5">
        {current?.isPublic ? (
          <GraduationCap className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
        ) : (
          <Building2 className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
        )}
        <span className="min-w-0">
          <span className="sr-only">{t("current")}</span>
          <span className="block max-w-[8rem] truncate text-sm font-semibold sm:max-w-[16rem]">
            {current?.name ?? t("select")}
          </span>
          {current ? (
            <span className="text-muted-foreground hidden text-xs sm:block">
              {tRoles(`${current.displayRole}.label`)}
            </span>
          ) : null}
        </span>
        <ChevronsUpDown className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuLabel>{t("heading")}</DropdownMenuLabel>
        {ordered.length === 0 ? (
          <p className="text-muted-foreground px-2.5 pb-2 text-sm">{t("none")}</p>
        ) : (
          ordered.map((w) => (
            <DropdownMenuItem key={w.slug} asChild>
              <Link href={`/o/${w.slug}`} aria-current={w.slug === currentSlug ? "true" : undefined}>
                {w.isPublic ? <GraduationCap aria-hidden="true" /> : <Building2 aria-hidden="true" />}
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{w.name}</span>
                  <span className="text-muted-foreground block text-xs">
                    {tRoles(`${w.displayRole}.label`)}
                    {w.suspended ? ` · ${t("suspended")}` : ""}
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
            {t("invitations")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/onboarding/organization">
            <Plus aria-hidden="true" />
            {t("addWorkspace")}
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

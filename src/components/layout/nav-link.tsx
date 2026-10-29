"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps } from "react";

/** Link that sets aria-current="page" when it matches the current route. */
export function NavLink({
  href,
  exact = false,
  ...props
}: ComponentProps<typeof Link> & { href: string; exact?: boolean }) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
  return <Link href={href} aria-current={active ? "page" : undefined} {...props} />;
}

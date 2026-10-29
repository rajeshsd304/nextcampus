import type { ReactNode } from "react";
import { NavLink } from "@/components/layout/nav-link";

export type SideNavItem = { href: string; label: string; icon: ReactNode; exact?: boolean };

/** Vertical navigation on large screens, horizontally scrollable tabs on small screens. */
export function SideNav({
  label,
  items,
  header,
}: {
  label: string;
  items: SideNavItem[];
  header?: ReactNode;
}) {
  return (
    <nav aria-label={label} className="lg:sticky lg:top-24 lg:w-60 lg:shrink-0 lg:self-start">
      {header ? <div className="mb-4 hidden lg:block">{header}</div> : null}
      <ul className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-2 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0">
        {items.map((item) => (
          <li key={item.href} className="shrink-0">
            <NavLink
              href={item.href}
              exact={item.exact ?? false}
              className="text-muted-foreground hover:bg-surface-muted hover:text-foreground aria-[current=page]:bg-accent aria-[current=page]:text-accent-foreground flex min-h-11 items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors [&_svg]:size-4"
            >
              {item.icon}
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

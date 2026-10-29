"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn, formatRelativeTime } from "@/lib/utils";
import { markNotificationsReadAction } from "../actions";
import type { NotificationItem } from "../server/queries";
import { NotificationIcon } from "./notification-icon";

export function NotificationBell({
  unreadCount,
  recent,
}: {
  unreadCount: number;
  recent: NotificationItem[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const label = unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications";

  const openItem = (item: NotificationItem) => {
    startTransition(async () => {
      if (!item.read_at) await markNotificationsReadAction({ ids: [item.id] });
      router.push(item.action_url ?? "/notifications");
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={label} className="relative">
          <Bell aria-hidden="true" />
          {unreadCount > 0 ? (
            <span
              className="bg-primary text-primary-foreground absolute top-1.5 right-1.5 flex min-w-4 items-center justify-center rounded-full px-1 text-[10px] leading-4 font-bold"
              aria-hidden="true"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[min(22rem,calc(100vw-2rem))]">
        <div className="flex items-center justify-between px-2.5 py-1.5">
          <DropdownMenuLabel className="text-foreground p-0 text-sm font-semibold">
            Notifications
          </DropdownMenuLabel>
          {unreadCount > 0 ? (
            <button
              type="button"
              className="text-primary rounded text-xs font-medium hover:underline dark:text-indigo-300"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  await markNotificationsReadAction({});
                  router.refresh();
                })
              }
            >
              Mark all read
            </button>
          ) : null}
        </div>
        <DropdownMenuSeparator />
        {recent.length === 0 ? (
          <p className="text-muted-foreground px-2.5 py-6 text-center text-sm">You&apos;re all caught up.</p>
        ) : (
          recent.map((item) => (
            <DropdownMenuItem
              key={item.id}
              onSelect={() => openItem(item)}
              className="items-start gap-3 py-2.5"
            >
              <NotificationIcon kind={item.kind} />
              <span className="min-w-0 flex-1">
                <span className={cn("block text-sm", !item.read_at && "font-semibold")}>{item.title}</span>
                <span className="text-muted-foreground block text-xs">
                  {formatRelativeTime(item.created_at)}
                </span>
              </span>
              {!item.read_at ? (
                <span className="bg-primary mt-1.5 size-2 rounded-full" aria-label="Unread" />
              ) : null}
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="justify-center font-medium">
          <Link href="/notifications">View all notifications</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

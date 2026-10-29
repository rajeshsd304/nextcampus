import { BellOff } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { SubmitButton } from "@/components/ui/submit-button";
import { requireViewer } from "@/features/auth/server/session";
import { markAllNotificationsReadFormAction } from "@/features/notifications/actions";
import { MarkReadButton } from "@/features/notifications/components/mark-read-button";
import { NotificationIcon } from "@/features/notifications/components/notification-icon";
import { listNotifications, NOTIFICATIONS_PAGE_SIZE } from "@/features/notifications/server/queries";
import { cn, formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage({ searchParams }: PageProps<"/notifications">) {
  const viewer = await requireViewer({ returnTo: "/notifications" });
  const query = await searchParams;
  const filter = query.filter === "unread" ? "unread" : "all";
  const page = Math.max(1, Number.parseInt(typeof query.page === "string" ? query.page : "1", 10) || 1);
  const { items, total } = await listNotifications(page, filter);
  const pageCount = Math.max(1, Math.ceil(total / NOTIFICATIONS_PAGE_SIZE));
  const hrefFor = (p: number, f = filter) => `/notifications?filter=${f}${p > 1 ? `&page=${p}` : ""}`;

  return (
    <main id="main" className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Notifications"
        description="Invitations, membership changes and security alerts for your account."
        actions={
          <form action={markAllNotificationsReadFormAction}>
            <SubmitButton variant="secondary" size="sm" pendingLabel="Marking all read">
              Mark all as read
            </SubmitButton>
          </form>
        }
      />
      <nav aria-label="Filter notifications" className="flex gap-2">
        {(["all", "unread"] as const).map((f) => (
          <Link
            key={f}
            href={hrefFor(1, f)}
            aria-current={filter === f ? "page" : undefined}
            className="border-border aria-[current=page]:bg-accent aria-[current=page]:text-accent-foreground rounded-full border px-3.5 py-1.5 text-sm font-medium aria-[current=page]:border-transparent"
          >
            {f === "all" ? "All" : "Unread"}
          </Link>
        ))}
      </nav>
      {items.length === 0 ? (
        <EmptyState
          icon={<BellOff />}
          title={filter === "unread" ? "No unread notifications" : "No notifications yet"}
          description="We'll let you know about invitations, role changes and security events."
        />
      ) : (
        <Card>
          <ul className="divide-border divide-y">
            {items.map((item) => (
              <li key={item.id} className={cn("flex gap-4 p-4 sm:p-5", !item.read_at && "bg-accent/40")}>
                <NotificationIcon kind={item.kind} />
                <div className="min-w-0 flex-1">
                  <p className={cn("text-sm", !item.read_at && "font-semibold")}>
                    {!item.read_at ? <span className="sr-only">Unread: </span> : null}
                    {item.title}
                  </p>
                  {item.body ? <p className="text-muted-foreground mt-0.5 text-sm">{item.body}</p> : null}
                  <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-3 text-xs">
                    <time dateTime={item.created_at}>
                      {formatDateTime(item.created_at, viewer.profile.timezone)}
                    </time>
                    {item.action_url ? (
                      <Link
                        href={item.action_url}
                        className="text-primary font-medium hover:underline dark:text-indigo-300"
                      >
                        Open
                      </Link>
                    ) : null}
                  </div>
                </div>
                {!item.read_at ? <MarkReadButton id={item.id} /> : null}
              </li>
            ))}
          </ul>
        </Card>
      )}
      {pageCount > 1 ? (
        <nav aria-label="Notification pages" className="flex items-center justify-between">
          <p className="text-muted-foreground text-sm">
            Page {page} of {pageCount}
          </p>
          <div className="flex gap-2">
            {page > 1 ? (
              <Button asChild variant="secondary" size="sm">
                <Link href={hrefFor(page - 1)}>Previous</Link>
              </Button>
            ) : null}
            {page < pageCount ? (
              <Button asChild variant="secondary" size="sm">
                <Link href={hrefFor(page + 1)}>Next</Link>
              </Button>
            ) : null}
          </div>
        </nav>
      ) : null}
    </main>
  );
}

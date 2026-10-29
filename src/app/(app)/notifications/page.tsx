import { BellOff } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { SubmitButton } from "@/components/ui/submit-button";
import { requireViewer } from "@/features/auth/server/session";
import { markAllNotificationsReadFormAction } from "@/features/notifications/actions";
import { MarkReadButton } from "@/features/notifications/components/mark-read-button";
import { NotificationIcon } from "@/features/notifications/components/notification-icon";
import { NotificationText } from "@/features/notifications/notification-text";
import { listNotifications, NOTIFICATIONS_PAGE_SIZE } from "@/features/notifications/server/queries";
import { getFormatContext } from "@/features/preferences/server";
import { formatDateTime, formatNumber } from "@/lib/i18n-format";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("notifications");
  return { title: t("title") };
}

export default async function NotificationsPage({ searchParams }: PageProps<"/notifications">) {
  const viewer = await requireViewer({ returnTo: "/notifications" });
  const query = await searchParams;
  const filter = query.filter === "unread" ? "unread" : "all";
  const page = Math.max(1, Number.parseInt(typeof query.page === "string" ? query.page : "1", 10) || 1);
  const [t, fmt, { items, total }] = await Promise.all([
    getTranslations("notifications"),
    getFormatContext(viewer.profile.timezone),
    listNotifications(page, filter),
  ]);
  const pageCount = Math.max(1, Math.ceil(total / NOTIFICATIONS_PAGE_SIZE));
  const hrefFor = (p: number, f = filter) => `/notifications?filter=${f}${p > 1 ? `&page=${p}` : ""}`;

  return (
    <main id="main" className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <form action={markAllNotificationsReadFormAction}>
            <SubmitButton variant="secondary" size="sm" pendingLabel={t("markingAll")}>
              {t("markAllRead")}
            </SubmitButton>
          </form>
        }
      />
      <nav aria-label={t("filterLabel")} className="flex gap-2">
        {(["all", "unread"] as const).map((f) => (
          <Link
            key={f}
            href={hrefFor(1, f)}
            aria-current={filter === f ? "page" : undefined}
            className="border-border aria-[current=page]:bg-accent aria-[current=page]:text-accent-foreground inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-medium aria-[current=page]:border-transparent"
          >
            {t(`filters.${f}`)}
          </Link>
        ))}
      </nav>
      {items.length === 0 ? (
        <EmptyState
          icon={<BellOff />}
          title={filter === "unread" ? t("emptyUnread") : t("emptyAll")}
          description={t("emptyDescription")}
        />
      ) : (
        <Card>
          <ul className="divide-border divide-y">
            {items.map((item) => (
              <li key={item.id} className={cn("flex gap-4 p-4 sm:p-5", !item.read_at && "bg-accent/40")}>
                <NotificationIcon kind={item.kind} />
                <div className="min-w-0 flex-1">
                  <p className={cn("text-sm", !item.read_at && "font-semibold")}>
                    {!item.read_at ? <span className="sr-only">{`${t("unread")}: `}</span> : null}
                    <NotificationText item={item} part="title" />
                  </p>
                  {item.body || item.template ? (
                    <p className="text-muted-foreground mt-0.5 text-sm">
                      <NotificationText item={item} part="body" />
                    </p>
                  ) : null}
                  <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-3 text-xs">
                    <time dateTime={item.created_at}>{formatDateTime(item.created_at, fmt)}</time>
                    {item.action_url ? (
                      <Link
                        href={item.action_url}
                        className="text-primary inline-flex min-h-11 items-center font-medium hover:underline dark:text-indigo-300"
                      >
                        {t("open")}
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
        <nav aria-label={t("pagination")} className="flex items-center justify-between">
          <p className="text-muted-foreground text-sm">
            {t("page", { page: formatNumber(page, fmt), total: formatNumber(pageCount, fmt) })}
          </p>
          <div className="flex gap-2">
            {page > 1 ? (
              <Button asChild variant="secondary" size="sm">
                <Link href={hrefFor(page - 1)}>{t("previous")}</Link>
              </Button>
            ) : null}
            {page < pageCount ? (
              <Button asChild variant="secondary" size="sm">
                <Link href={hrefFor(page + 1)}>{t("next")}</Link>
              </Button>
            ) : null}
          </div>
        </nav>
      ) : null}
    </main>
  );
}

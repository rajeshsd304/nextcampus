import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/misc";

export default function Loading() {
  const t = useTranslations("common");
  return (
    <div className="space-y-6" role="status" aria-label={t("loading")}>
      <Skeleton className="h-10 w-72 max-w-full" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
      <Skeleton className="h-72" />
    </div>
  );
}

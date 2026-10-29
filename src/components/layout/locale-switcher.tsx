import { Languages } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { SubmitButton } from "@/components/ui/submit-button";
import { switchLocaleFormAction } from "@/features/preferences/actions";
import { LOCALE_NATIVE_NAMES, LOCALES } from "@/i18n/config";
import { cn } from "@/lib/utils";

/**
 * Language switcher. A plain form posting to a Server Action, so it works
 * without client JavaScript; the choice is stored in a cookie and, for
 * signed-in users, in their profile.
 */
export async function LocaleSwitcher({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const locale = await getLocale();
  const t = await getTranslations("locale");

  return (
    <form action={switchLocaleFormAction} className={cn("inline-flex", className)}>
      <fieldset className="flex items-center gap-1">
        <legend className="sr-only">{t("label")}</legend>
        {compact ? null : <Languages className="text-muted-foreground mr-1 size-4" aria-hidden="true" />}
        <div className="border-border flex rounded-xl border p-0.5">
          {LOCALES.map((option) => (
            <SubmitButton
              key={option}
              name="locale"
              value={option}
              variant="ghost"
              size="sm"
              lang={option}
              aria-pressed={option === locale}
              aria-label={t("switchTo", { language: LOCALE_NATIVE_NAMES[option] })}
              pendingLabel={t("switching")}
              className={cn(
                "min-w-11 rounded-[0.6rem] px-2.5 text-sm",
                option === locale && "bg-accent text-accent-foreground hover:bg-accent",
              )}
            >
              {LOCALE_NATIVE_NAMES[option]}
            </SubmitButton>
          ))}
        </div>
      </fieldset>
    </form>
  );
}

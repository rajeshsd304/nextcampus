"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";

const subscribe = () => () => {};
type Mode = "light" | "dark" | "system";

/** Cycles light → dark → system. Renders a stable placeholder until hydrated. */
export function ThemeToggle() {
  const t = useTranslations("theme");
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );

  const current: Mode = mounted && (theme === "light" || theme === "dark") ? theme : "system";
  const next: Mode = current === "light" ? "dark" : current === "dark" ? "system" : "light";
  const Icon = current === "light" ? Sun : current === "dark" ? Moon : Monitor;

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(next)}
      aria-label={t("toggle", { current: t(current), next: t(next) })}
      title={t("current", { current: t(current) })}
    >
      <Icon aria-hidden="true" />
    </Button>
  );
}

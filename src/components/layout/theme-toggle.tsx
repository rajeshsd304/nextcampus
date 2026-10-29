"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";

const subscribe = () => () => {};

/** Cycles light → dark → system. Renders a stable placeholder until hydrated. */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );

  const current = mounted ? (theme ?? "system") : "system";
  const next = current === "light" ? "dark" : current === "dark" ? "system" : "light";
  const Icon = current === "light" ? Sun : current === "dark" ? Moon : Monitor;

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(next)}
      aria-label={`Color theme: ${current}. Switch to ${next}.`}
      title={`Theme: ${current}`}
    >
      <Icon aria-hidden="true" />
    </Button>
  );
}

import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppHeader } from "@/components/app-shell/app-header";
import { requireViewer } from "@/features/auth/server/session";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AppLayout({ children }: { children: ReactNode }) {
  const viewer = await requireViewer();
  return (
    <div className="min-h-dvh">
      <AppHeader viewer={viewer} />
      <div className="mx-auto w-full max-w-[90rem] px-4 py-6 sm:px-6 lg:py-10">{children}</div>
    </div>
  );
}

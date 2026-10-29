import { LayoutDashboard, Library } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { SideNav } from "@/components/app-shell/side-nav";
import { requireSuperAdmin } from "@/features/auth/server/session";

export default async function PlatformLayout({ children }: { children: ReactNode }) {
  await requireSuperAdmin();
  const t = await getTranslations("platform.nav");
  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:gap-10">
      <SideNav
        label={t("label")}
        header={<p className="text-muted-foreground px-3 text-sm font-semibold">{t("label")}</p>}
        items={[
          { href: "/platform", label: t("overview"), icon: <LayoutDashboard />, exact: true },
          { href: "/platform/catalog", label: t("catalog"), icon: <Library /> },
        ]}
      />
      <main id="main" className="min-w-0 flex-1">
        {children}
      </main>
    </div>
  );
}

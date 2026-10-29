import { Building2, ShieldCheck, User } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { SideNav } from "@/components/app-shell/side-nav";

export default async function SettingsLayout({ children }: { children: ReactNode }) {
  const t = await getTranslations("settings.nav");
  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:gap-10">
      <SideNav
        label={t("label")}
        header={<p className="text-muted-foreground px-3 text-sm font-semibold">{t("label")}</p>}
        items={[
          { href: "/settings", label: t("profile"), icon: <User />, exact: true },
          { href: "/settings/security", label: t("security"), icon: <ShieldCheck /> },
          { href: "/settings/organizations", label: t("organizations"), icon: <Building2 /> },
        ]}
      />
      <main id="main" className="max-w-3xl min-w-0 flex-1 space-y-6">
        {children}
      </main>
    </div>
  );
}

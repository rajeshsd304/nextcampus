import { Building2, ShieldCheck, User } from "lucide-react";
import type { ReactNode } from "react";
import { SideNav } from "@/components/app-shell/side-nav";

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:gap-10">
      <SideNav
        label="Account settings"
        header={<p className="text-muted-foreground px-3 text-sm font-semibold">Account settings</p>}
        items={[
          { href: "/settings", label: "Profile", icon: <User />, exact: true },
          { href: "/settings/security", label: "Security", icon: <ShieldCheck /> },
          { href: "/settings/organizations", label: "Organizations", icon: <Building2 /> },
        ]}
      />
      <main id="main" className="max-w-3xl min-w-0 flex-1 space-y-6">
        {children}
      </main>
    </div>
  );
}

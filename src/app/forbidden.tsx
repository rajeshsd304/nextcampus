import { ShieldAlert } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";

export default async function Forbidden() {
  const t = await getTranslations("states.forbidden");
  return (
    <main
      id="main"
      className="container-page flex min-h-[70dvh] flex-col items-center justify-center py-24 text-center"
    >
      <div className="bg-accent text-accent-foreground flex size-14 items-center justify-center rounded-2xl">
        <ShieldAlert className="size-7" aria-hidden="true" />
      </div>
      <h1 className="font-display mt-5 text-3xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="text-muted-foreground mt-3 max-w-md">{t("body")}</p>
      <Button asChild className="mt-8">
        <Link href="/dashboard">{t("cta")}</Link>
      </Button>
    </main>
  );
}

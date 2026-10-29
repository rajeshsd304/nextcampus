import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";

export default async function NotFound() {
  const t = await getTranslations("states.notFound");
  return (
    <main
      id="main"
      className="container-page flex min-h-dvh flex-col items-center justify-center py-24 text-center"
    >
      <p className="text-primary text-sm font-semibold dark:text-indigo-300">{t("code")}</p>
      <h1 className="font-display mt-2 text-3xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="text-muted-foreground mt-3 max-w-md">{t("body")}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button asChild>
          <Link href="/">{t("home")}</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/dashboard">{t("dashboard")}</Link>
        </Button>
      </div>
    </main>
  );
}

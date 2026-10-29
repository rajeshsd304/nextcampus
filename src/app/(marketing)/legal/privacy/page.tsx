import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LegalPage } from "@/features/marketing/components/legal-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("legal.privacy");
  return { title: t("title"), alternates: { canonical: "/legal/privacy" } };
}

export default function Page() {
  return <LegalPage doc="privacy" updated="2026-10-30" />;
}

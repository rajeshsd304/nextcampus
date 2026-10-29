import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LegalPage } from "@/features/marketing/components/legal-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("legal.terms");
  return { title: t("title"), alternates: { canonical: "/legal/terms" } };
}

export default function Page() {
  return <LegalPage doc="terms" updated="2026-10-30" />;
}

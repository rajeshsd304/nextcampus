import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ImportPage } from "@/features/questions/pages";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("questions");
  return { title: t("import.title") };
}

export default async function Page() {
  return <ImportPage bank={{ kind: "platform" }} />;
}

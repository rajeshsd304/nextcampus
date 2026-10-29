import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { EditQuestionPage } from "@/features/questions/pages";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("questions");
  return { title: t("editor.edit") };
}

export default async function Page({ params }: PageProps<"/platform/questions/[id]/edit">) {
  const { id } = await params;
  return <EditQuestionPage bank={{ kind: "platform" }} id={id} />;
}

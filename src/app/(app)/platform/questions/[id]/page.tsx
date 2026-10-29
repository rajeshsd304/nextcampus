import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { QuestionDetailPage } from "@/features/questions/pages";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("questions");
  return { title: t("detail.metaTitle") };
}

export default async function Page({ params }: PageProps<"/platform/questions/[id]">) {
  const { id } = await params;
  return <QuestionDetailPage bank={{ kind: "platform" }} id={id} />;
}

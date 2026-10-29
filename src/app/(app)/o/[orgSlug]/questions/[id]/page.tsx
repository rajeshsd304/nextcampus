import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { QuestionDetailPage } from "@/features/questions/pages";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("questions");
  return { title: t("detail.metaTitle") };
}

export default async function Page({ params }: PageProps<"/o/[orgSlug]/questions/[id]">) {
  const { orgSlug, id } = await params;
  return <QuestionDetailPage bank={{ kind: "org", slug: orgSlug }} id={id} />;
}

import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { NewQuestionPage } from "@/features/questions/pages";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("questions");
  return { title: t("editor.newTitle") };
}

export default async function Page({ params, searchParams }: PageProps<"/o/[orgSlug]/questions/new">) {
  const { orgSlug } = await params;
  const query = await searchParams;
  return (
    <NewQuestionPage
      bank={{ kind: "org", slug: orgSlug }}
      type={typeof query.type === "string" ? query.type : undefined}
    />
  );
}

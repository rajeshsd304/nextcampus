import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { QuestionBankPage } from "@/features/questions/pages";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("questions");
  return { title: t("list.title") };
}

export default async function Page({ params, searchParams }: PageProps<"/o/[orgSlug]/questions">) {
  const { orgSlug } = await params;
  const query = await searchParams;
  return <QuestionBankPage bank={{ kind: "org", slug: orgSlug }} searchParams={query} />;
}

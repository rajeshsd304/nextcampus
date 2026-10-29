import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { QuestionBankPage } from "@/features/questions/pages";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("questions");
  return { title: t("review.title") };
}

export default async function Page({ searchParams }: PageProps<"/platform/questions/review">) {
  const query = await searchParams;
  return <QuestionBankPage bank={{ kind: "platform" }} searchParams={query} review />;
}

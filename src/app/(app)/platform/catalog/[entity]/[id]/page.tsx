import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";
import { requireSuperAdmin } from "@/features/auth/server/session";
import {
  CategoryForm,
  ExamTargetForm,
  SubjectForm,
  TopicForm,
  UniversityForm,
} from "@/features/catalog/components/catalog-forms";
import { loadAdminCatalog } from "@/features/catalog/server/queries";
import { isCatalogEntitySegment, localized } from "@/features/catalog/types";

export async function generateMetadata({
  params,
}: PageProps<"/platform/catalog/[entity]/[id]">): Promise<Metadata> {
  const { entity, id } = await params;
  const t = await getTranslations("catalogAdmin");
  if (!isCatalogEntitySegment(entity)) return { title: t("title") };
  return { title: t(id === "new" ? `sections.${entity}.add` : `sections.${entity}.edit`) };
}

export default async function CatalogItemPage({ params }: PageProps<"/platform/catalog/[entity]/[id]">) {
  await requireSuperAdmin();
  const { entity, id: rawId } = await params;
  if (!isCatalogEntitySegment(entity)) notFound();
  const id = decodeURIComponent(rawId);
  const isNew = id === "new";

  const [t, locale, catalog] = await Promise.all([
    getTranslations("catalogAdmin"),
    getLocale(),
    loadAdminCatalog(),
  ]);

  let form;
  switch (entity) {
    case "categories": {
      const row = isNew ? null : catalog.categories.find((c) => c.key === id);
      if (!isNew && !row) notFound();
      form = (
        <CategoryForm
          defaults={
            row
              ? {
                  originalKey: row.key,
                  key: row.key,
                  nameEn: row.name_en,
                  nameBn: row.name_bn,
                  isActive: row.is_active,
                }
              : { key: "", nameEn: "", nameBn: "", isActive: true }
          }
        />
      );
      break;
    }
    case "universities": {
      const row = isNew ? null : catalog.universities.find((u) => u.id === id);
      if (!isNew && !row) notFound();
      form = (
        <UniversityForm
          categories={catalog.categories.map((c) => ({ key: c.key, label: localized(c, "name", locale) }))}
          defaults={
            row
              ? {
                  id: row.id,
                  slug: row.slug,
                  nameEn: row.name_en,
                  nameBn: row.name_bn,
                  shortCode: row.short_code,
                  categoryKey: row.category_key,
                  website: row.website ?? "",
                  isActive: row.is_active,
                }
              : {
                  slug: "",
                  nameEn: "",
                  nameBn: "",
                  shortCode: "",
                  categoryKey: catalog.categories[0]?.key ?? "",
                  website: "",
                  isActive: true,
                }
          }
        />
      );
      break;
    }
    case "subjects": {
      const row = isNew ? null : catalog.subjects.find((s) => s.id === id);
      if (!isNew && !row) notFound();
      form = (
        <SubjectForm
          defaults={
            row
              ? {
                  id: row.id,
                  slug: row.slug,
                  nameEn: row.name_en,
                  nameBn: row.name_bn,
                  isActive: row.is_active,
                }
              : { slug: "", nameEn: "", nameBn: "", isActive: true }
          }
        />
      );
      break;
    }
    case "topics": {
      const row = isNew ? null : catalog.topics.find((topic) => topic.id === id);
      if (!isNew && !row) notFound();
      form = (
        <TopicForm
          subjects={catalog.subjects.map((s) => ({ id: s.id, label: localized(s, "name", locale) }))}
          topics={catalog.topics.map((topic) => ({
            id: topic.id,
            subjectId: topic.subject_id,
            label: localized(topic, "name", locale),
          }))}
          defaults={
            row
              ? {
                  id: row.id,
                  subjectId: row.subject_id,
                  parentId: row.parent_id ?? "",
                  slug: row.slug,
                  nameEn: row.name_en,
                  nameBn: row.name_bn,
                  isActive: row.is_active,
                }
              : {
                  subjectId: catalog.subjects[0]?.id ?? "",
                  parentId: "",
                  slug: "",
                  nameEn: "",
                  nameBn: "",
                  isActive: true,
                }
          }
        />
      );
      break;
    }
    case "targets": {
      const row = isNew ? null : catalog.targets.find((x) => x.id === id);
      if (!isNew && !row) notFound();
      form = (
        <ExamTargetForm
          universities={catalog.universities.map((u) => ({ id: u.id, label: localized(u, "name", locale) }))}
          subjects={catalog.subjects.map((s) => ({ id: s.id, label: localized(s, "name", locale) }))}
          defaults={
            row
              ? {
                  id: row.id,
                  universityId: row.university_id,
                  slug: row.slug,
                  nameEn: row.name_en,
                  nameBn: row.name_bn,
                  descriptionEn: row.description_en ?? "",
                  descriptionBn: row.description_bn ?? "",
                  formatEn: row.typical_format_en ?? "",
                  formatBn: row.typical_format_bn ?? "",
                  negativeMarking: row.negative_marking,
                  isActive: row.is_active,
                  subjectIds: row.subjectIds,
                }
              : {
                  universityId: catalog.universities[0]?.id ?? "",
                  slug: "",
                  nameEn: "",
                  nameBn: "",
                  descriptionEn: "",
                  descriptionBn: "",
                  formatEn: "",
                  formatBn: "",
                  negativeMarking: 0.25,
                  isActive: true,
                  subjectIds: [],
                }
          }
        />
      );
      break;
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <nav aria-label={t("breadcrumb")}>
        <Link
          href="/platform/catalog"
          className="text-muted-foreground hover:text-foreground inline-flex min-h-11 items-center text-sm"
        >
          {t("back")}
        </Link>
      </nav>
      <PageHeader
        title={t(isNew ? `sections.${entity}.add` : `sections.${entity}.edit`)}
        description={t("formDescription")}
      />
      <Card>
        <CardContent className="pt-6 sm:pt-6">{form}</CardContent>
      </Card>
    </div>
  );
}

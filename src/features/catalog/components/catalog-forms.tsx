"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useTransition, type ReactNode } from "react";
import { useForm, useWatch, type FieldValues, type Path, type UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Spinner } from "@/components/ui/misc";
import { FormError } from "@/features/auth/components/form-error";
import type { ActionResult } from "@/lib/action-result";
import { applyActionErrors } from "@/lib/forms";
import {
  saveCategoryAction,
  saveExamTargetAction,
  saveSubjectAction,
  saveTopicAction,
  saveUniversityAction,
} from "../actions";
import {
  categoryFormSchema,
  examTargetFormSchema,
  subjectFormSchema,
  topicFormSchema,
  universityFormSchema,
  type CategoryFormInput,
  type ExamTargetFormInput,
  type SubjectFormInput,
  type TopicFormInput,
  type UniversityFormInput,
} from "../schemas";

const RETURN_TO = "/platform/catalog";

function useSubmit<T extends FieldValues>(
  form: UseFormReturn<T>,
  action: (values: T) => Promise<ActionResult>,
  fields: readonly Path<T>[],
) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await action(values);
      if (result.ok) {
        router.push(RETURN_TO);
        router.refresh();
      } else applyActionErrors(form, result, fields);
    });
  });
  return { pending, onSubmit };
}

function FormShell({
  onSubmit,
  pending,
  rootError,
  children,
}: {
  onSubmit: () => void;
  pending: boolean;
  rootError: string | undefined;
  children: ReactNode;
}) {
  const t = useTranslations("catalogAdmin.form");
  const router = useRouter();
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      noValidate
      className="space-y-5"
    >
      <FormError message={rootError} />
      {children}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? <Spinner label={t("saving")} /> : null}
          {t("save")}
        </Button>
        <Button variant="secondary" onClick={() => router.push(RETURN_TO)}>
          {t("cancel")}
        </Button>
      </div>
    </form>
  );
}

function ActiveCheckbox<T extends FieldValues>({ form, name }: { form: UseFormReturn<T>; name: Path<T> }) {
  const t = useTranslations("catalogAdmin.form");
  return (
    <div className="flex items-start gap-3">
      <input
        id="catalog-active"
        type="checkbox"
        className="mt-1 size-5 shrink-0 accent-indigo-600"
        {...form.register(name)}
      />
      <label htmlFor="catalog-active" className="text-sm">
        <span className="font-medium">{t("active")}</span>
        <span className="text-muted-foreground block">{t("activeHint")}</span>
      </label>
    </div>
  );
}

export function CategoryForm({ defaults }: { defaults: CategoryFormInput }) {
  const t = useTranslations("catalogAdmin.form");
  const form = useForm<CategoryFormInput>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: defaults,
  });
  const { errors } = form.formState;
  const { pending, onSubmit } = useSubmit(form, saveCategoryAction, ["key", "nameEn", "nameBn"]);
  return (
    <FormShell onSubmit={onSubmit} pending={pending} rootError={errors.root?.server?.message}>
      <FormField id="cat-key" label={t("key")} description={t("keyHint")} error={errors.key?.message}>
        <Input lang="en" autoCapitalize="none" spellCheck={false} {...form.register("key")} />
      </FormField>
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField id="cat-name-bn" label={t("nameBn")} error={errors.nameBn?.message}>
          <Input lang="bn" {...form.register("nameBn")} />
        </FormField>
        <FormField id="cat-name-en" label={t("nameEn")} error={errors.nameEn?.message}>
          <Input lang="en" {...form.register("nameEn")} />
        </FormField>
      </div>
      <ActiveCheckbox form={form} name="isActive" />
    </FormShell>
  );
}

export function UniversityForm({
  defaults,
  categories,
}: {
  defaults: UniversityFormInput;
  categories: { key: string; label: string }[];
}) {
  const t = useTranslations("catalogAdmin.form");
  const form = useForm<UniversityFormInput>({
    resolver: zodResolver(universityFormSchema),
    defaultValues: defaults,
  });
  const { errors } = form.formState;
  const { pending, onSubmit } = useSubmit(form, saveUniversityAction, [
    "slug",
    "nameEn",
    "nameBn",
    "shortCode",
    "categoryKey",
    "website",
  ]);
  return (
    <FormShell onSubmit={onSubmit} pending={pending} rootError={errors.root?.server?.message}>
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField id="uni-name-bn" label={t("nameBn")} error={errors.nameBn?.message}>
          <Input lang="bn" {...form.register("nameBn")} />
        </FormField>
        <FormField id="uni-name-en" label={t("nameEn")} error={errors.nameEn?.message}>
          <Input lang="en" {...form.register("nameEn")} />
        </FormField>
        <FormField id="uni-slug" label={t("slug")} description={t("slugHint")} error={errors.slug?.message}>
          <Input lang="en" autoCapitalize="none" spellCheck={false} {...form.register("slug")} />
        </FormField>
        <FormField id="uni-code" label={t("shortCode")} error={errors.shortCode?.message}>
          <Input lang="en" {...form.register("shortCode")} />
        </FormField>
        <FormField id="uni-category" label={t("category")} error={errors.categoryKey?.message}>
          <Select {...form.register("categoryKey")}>
            {categories.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField id="uni-website" label={t("website")} optional error={errors.website?.message}>
          <Input type="url" inputMode="url" lang="en" placeholder="https://" {...form.register("website")} />
        </FormField>
      </div>
      <ActiveCheckbox form={form} name="isActive" />
    </FormShell>
  );
}

export function SubjectForm({ defaults }: { defaults: SubjectFormInput }) {
  const t = useTranslations("catalogAdmin.form");
  const form = useForm<SubjectFormInput>({
    resolver: zodResolver(subjectFormSchema),
    defaultValues: defaults,
  });
  const { errors } = form.formState;
  const { pending, onSubmit } = useSubmit(form, saveSubjectAction, ["slug", "nameEn", "nameBn"]);
  return (
    <FormShell onSubmit={onSubmit} pending={pending} rootError={errors.root?.server?.message}>
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField id="sub-name-bn" label={t("nameBn")} error={errors.nameBn?.message}>
          <Input lang="bn" {...form.register("nameBn")} />
        </FormField>
        <FormField id="sub-name-en" label={t("nameEn")} error={errors.nameEn?.message}>
          <Input lang="en" {...form.register("nameEn")} />
        </FormField>
        <FormField id="sub-slug" label={t("slug")} description={t("slugHint")} error={errors.slug?.message}>
          <Input lang="en" autoCapitalize="none" spellCheck={false} {...form.register("slug")} />
        </FormField>
      </div>
      <ActiveCheckbox form={form} name="isActive" />
    </FormShell>
  );
}

export function ExamTargetForm({
  defaults,
  universities,
  subjects,
}: {
  defaults: ExamTargetFormInput;
  universities: { id: string; label: string }[];
  subjects: { id: string; label: string }[];
}) {
  const t = useTranslations("catalogAdmin.form");
  const form = useForm<ExamTargetFormInput>({
    resolver: zodResolver(examTargetFormSchema),
    defaultValues: defaults,
  });
  const { errors } = form.formState;
  const { pending, onSubmit } = useSubmit(form, saveExamTargetAction, [
    "universityId",
    "slug",
    "nameEn",
    "nameBn",
    "descriptionEn",
    "descriptionBn",
    "formatEn",
    "formatBn",
    "negativeMarking",
  ]);
  return (
    <FormShell onSubmit={onSubmit} pending={pending} rootError={errors.root?.server?.message}>
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField id="target-university" label={t("university")} error={errors.universityId?.message}>
          <Select {...form.register("universityId")}>
            {universities.map((u) => (
              <option key={u.id} value={u.id}>
                {u.label}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField
          id="target-slug"
          label={t("slug")}
          description={t("slugHint")}
          error={errors.slug?.message}
        >
          <Input lang="en" autoCapitalize="none" spellCheck={false} {...form.register("slug")} />
        </FormField>
        <FormField id="target-name-bn" label={t("nameBn")} error={errors.nameBn?.message}>
          <Input lang="bn" {...form.register("nameBn")} />
        </FormField>
        <FormField id="target-name-en" label={t("nameEn")} error={errors.nameEn?.message}>
          <Input lang="en" {...form.register("nameEn")} />
        </FormField>
        <FormField
          id="target-desc-bn"
          label={t("descriptionBn")}
          optional
          error={errors.descriptionBn?.message}
        >
          <Textarea lang="bn" rows={3} {...form.register("descriptionBn")} />
        </FormField>
        <FormField
          id="target-desc-en"
          label={t("descriptionEn")}
          optional
          error={errors.descriptionEn?.message}
        >
          <Textarea lang="en" rows={3} {...form.register("descriptionEn")} />
        </FormField>
        <FormField id="target-format-bn" label={t("formatBn")} optional error={errors.formatBn?.message}>
          <Textarea lang="bn" rows={3} {...form.register("formatBn")} />
        </FormField>
        <FormField id="target-format-en" label={t("formatEn")} optional error={errors.formatEn?.message}>
          <Textarea lang="en" rows={3} {...form.register("formatEn")} />
        </FormField>
        <FormField
          id="target-negative"
          label={t("negativeMarking")}
          description={t("negativeMarkingHint")}
          error={errors.negativeMarking?.message}
        >
          <Input
            type="number"
            inputMode="decimal"
            step="0.05"
            min="0"
            max="1"
            {...form.register("negativeMarking", { valueAsNumber: true })}
          />
        </FormField>
      </div>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">{t("subjects")}</legend>
        <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
          {subjects.map((s) => (
            <label
              key={s.id}
              className="hover:bg-surface-muted flex min-h-11 items-center gap-3 rounded-lg px-2"
            >
              <input
                type="checkbox"
                value={s.id}
                className="size-5 shrink-0 accent-indigo-600"
                {...form.register("subjectIds")}
              />
              <span className="text-sm">{s.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <ActiveCheckbox form={form} name="isActive" />
    </FormShell>
  );
}

export function TopicForm({
  defaults,
  subjects,
  topics,
}: {
  defaults: TopicFormInput;
  subjects: { id: string; label: string }[];
  topics: { id: string; subjectId: string; label: string }[];
}) {
  const t = useTranslations("catalogAdmin.form");
  const form = useForm<TopicFormInput>({ resolver: zodResolver(topicFormSchema), defaultValues: defaults });
  const { errors } = form.formState;
  const subjectId = useWatch({ control: form.control, name: "subjectId" });
  const { pending, onSubmit } = useSubmit(form, saveTopicAction, [
    "subjectId",
    "parentId",
    "slug",
    "nameEn",
    "nameBn",
  ]);
  const parents = topics.filter((topic) => topic.subjectId === subjectId && topic.id !== defaults.id);
  return (
    <FormShell onSubmit={onSubmit} pending={pending} rootError={errors.root?.server?.message}>
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField id="topic-subject" label={t("subject")} error={errors.subjectId?.message}>
          <Select {...form.register("subjectId", { onChange: () => form.setValue("parentId", "") })}>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField id="topic-parent" label={t("parentTopic")} optional error={errors.parentId?.message}>
          <Select {...form.register("parentId")}>
            <option value="">{t("noParent")}</option>
            {parents.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField id="topic-name-bn" label={t("nameBn")} error={errors.nameBn?.message}>
          <Input lang="bn" {...form.register("nameBn")} />
        </FormField>
        <FormField id="topic-name-en" label={t("nameEn")} error={errors.nameEn?.message}>
          <Input lang="en" {...form.register("nameEn")} />
        </FormField>
        <FormField
          id="topic-slug"
          label={t("slug")}
          description={t("topicSlugHint")}
          error={errors.slug?.message}
        >
          <Input lang="en" autoCapitalize="none" spellCheck={false} {...form.register("slug")} />
        </FormField>
      </div>
      <ActiveCheckbox form={form} name="isActive" />
    </FormShell>
  );
}

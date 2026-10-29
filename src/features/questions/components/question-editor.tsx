"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { useFieldArray, useForm, useWatch, type Control } from "react-hook-form";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Spinner } from "@/components/ui/misc";
import { FormError } from "@/features/auth/components/form-error";
import { useMessageText } from "@/i18n/use-message-text";
import { applyActionErrors } from "@/lib/forms";
import { saveQuestionAction } from "../actions";
import { MCQ_MAX_OPTIONS, MCQ_MIN_OPTIONS, QUESTION_DIFFICULTIES, WRITTEN_ANSWER_MODES } from "../constants";
import { MathText } from "../math";
import { questionFormSchema, type QuestionFormInput } from "../schemas";
import type { BankRef } from "../server/context";
import type { Taxonomy } from "../server/queries";

type Field = keyof QuestionFormInput;

function Preview({
  control,
  name,
  lang,
}: {
  control: Control<QuestionFormInput>;
  name: Field;
  lang: "bn" | "en";
}) {
  const t = useTranslations("questionForms");
  const value = useWatch({ control, name });
  if (typeof value !== "string" || !value.trim()) return null;
  return (
    <div
      className="border-border bg-surface-muted/50 rounded-lg border border-dashed p-2.5 text-sm"
      aria-label={t("preview")}
    >
      <MathText text={value} lang={lang} />
    </div>
  );
}

/** A bn/en pair of text areas with live previews, side by side on wide screens. */
function BilingualField({
  form,
  idPrefix,
  label,
  bn,
  en,
  rows = 3,
}: {
  form: ReturnType<typeof useForm<QuestionFormInput>>;
  idPrefix: string;
  label: string;
  bn: Field;
  en: Field;
  rows?: number;
}) {
  const t = useTranslations("questionForms");
  const error = (name: Field) => {
    const value = form.formState.errors[name];
    return value && "message" in value && typeof value.message === "string" ? value.message : undefined;
  };
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-semibold">{label}</legend>
      <div className="grid gap-4 lg:grid-cols-2">
        {(
          [
            ["bn", bn],
            ["en", en],
          ] as const
        ).map(([lang, name]) => (
          <div key={lang} className="space-y-2">
            <FormField id={`${idPrefix}-${lang}`} label={t(`lang.${lang}`)} error={error(name)}>
              <Textarea lang={lang} rows={rows} className="min-h-20" {...form.register(name)} />
            </FormField>
            <Preview control={form.control} name={name} lang={lang} />
          </div>
        ))}
      </div>
    </fieldset>
  );
}

export function QuestionEditor({
  bank,
  basePath,
  questionId,
  defaults,
  taxonomy,
}: {
  bank: BankRef;
  basePath: string;
  questionId?: string;
  defaults: QuestionFormInput;
  taxonomy: Taxonomy;
}) {
  const t = useTranslations("questionForms");
  const tLabels = useTranslations("questionLabels");
  const text = useMessageText();
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [duplicates, setDuplicates] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);

  const form = useForm<QuestionFormInput>({
    resolver: zodResolver(questionFormSchema),
    defaultValues: defaults,
  });
  const { errors } = form.formState;
  const options = useFieldArray({ control: form.control, name: "options" });
  const criteria = useFieldArray({ control: form.control, name: "criteria" });
  const type = defaults.type;
  const subjectId = useWatch({ control: form.control, name: "subjectId" });
  const marks = useWatch({ control: form.control, name: "marks" });
  const criteriaValues = useWatch({ control: form.control, name: "criteria" });
  const correctIndex = useWatch({ control: form.control, name: "correctIndex" });
  const name = (row: { name_bn: string; name_en: string }) => (locale === "bn" ? row.name_bn : row.name_en);
  const topics = taxonomy.topics.filter((topic) => topic.subject_id === subjectId);
  const rubricTotal = (criteriaValues ?? []).reduce((sum, c) => sum + (Number(c.maxMarks) || 0), 0);
  const fieldError = (value: unknown) =>
    value && typeof value === "object" && "message" in value && typeof value.message === "string"
      ? value.message
      : undefined;

  const onSubmit = form.handleSubmit((values) => {
    setSaved(false);
    startTransition(async () => {
      const result = await saveQuestionAction({ bank, questionId, values });
      if (!result.ok) {
        applyActionErrors(form, result, [
          "stemBn",
          "stemEn",
          "marks",
          "subjectId",
          "topicId",
          "options",
          "criteria",
        ]);
        return;
      }
      setDuplicates(result.data.duplicateIds);
      setSaved(true);
      if (!questionId)
        router.push(
          `${basePath}/${result.data.questionId}/edit${result.data.duplicateIds.length ? "?duplicates=1" : ""}`,
        );
      else router.refresh();
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      {saved ? (
        <Alert tone="success" live>
          {t("saved")}
        </Alert>
      ) : null}
      {duplicates.length > 0 ? (
        <Alert tone="warning" title={t("duplicatesTitle")} live>
          <p>{t("duplicatesBody")}</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {duplicates.map((id, index) => (
              <li key={id}>
                <Link
                  href={`${basePath}/${id}`}
                  className="inline-flex min-h-11 items-center font-medium underline"
                >
                  {t("duplicateLink", { number: index + 1 })}
                </Link>
              </li>
            ))}
          </ul>
        </Alert>
      ) : null}
      <FormError message={errors.root?.server?.message} />

      <Card>
        <CardHeader>
          <CardTitle>{t("sections.classification")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <FormField id="q-subject" label={t("subject")} error={errors.subjectId?.message}>
            <Select
              {...form.register("subjectId", {
                onChange: (event: { target: { value: string } }) => {
                  const first = taxonomy.topics.find((topic) => topic.subject_id === event.target.value);
                  form.setValue("topicId", first?.id ?? "");
                },
              })}
            >
              {taxonomy.subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {name(s)}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField id="q-topic" label={t("topic")} error={errors.topicId?.message}>
            <Select {...form.register("topicId")}>
              {topics.length === 0 ? <option value="">{t("noTopics")}</option> : null}
              {topics.map((topic) => (
                <option key={topic.id} value={topic.id}>
                  {name(topic)}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField id="q-exam-target" label={t("examTarget")} optional>
            <Select {...form.register("examTargetId")}>
              <option value="">{t("noExamTarget")}</option>
              {taxonomy.examTargets.map((target) => (
                <option key={target.id} value={target.id}>
                  {`${taxonomy.universities.find((u) => u.id === target.university_id)?.short_code ?? ""} · ${name(target)}`}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField id="q-difficulty" label={t("difficulty")}>
            <Select {...form.register("difficulty")}>
              {QUESTION_DIFFICULTIES.map((d) => (
                <option key={d} value={d}>
                  {tLabels(`difficulties.${d}`)}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField id="q-marks" label={t("marks")} error={errors.marks?.message}>
            <Input
              type="number"
              inputMode="decimal"
              step="0.25"
              min="0.25"
              max="100"
              {...form.register("marks", { valueAsNumber: true })}
            />
          </FormField>
          <FormField
            id="q-source"
            label={t("sourceNote")}
            optional
            description={t("sourceNoteHint")}
            error={errors.sourceNote?.message}
          >
            <Input {...form.register("sourceNote")} />
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("sections.question")}</CardTitle>
          <p className="text-muted-foreground text-sm">{t("mathHint")}</p>
        </CardHeader>
        <CardContent>
          <BilingualField form={form} idPrefix="q-stem" label={t("stem")} bn="stemBn" en="stemEn" rows={5} />
        </CardContent>
      </Card>

      {type === "mcq" ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("sections.options")}</CardTitle>
            <p className="text-muted-foreground text-sm">
              {t("optionsHint", { min: MCQ_MIN_OPTIONS, max: MCQ_MAX_OPTIONS })}
            </p>
          </CardHeader>
          <CardContent className="space-y-5">
            <fieldset>
              <legend className="sr-only">{t("correctOption")}</legend>
              <ol className="space-y-5">
                {options.fields.map((field, index) => (
                  <li key={field.id} className="border-border rounded-xl border p-4">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <label className="inline-flex min-h-11 items-center gap-3 font-semibold">
                        <input
                          type="radio"
                          name="correct-option"
                          className="size-5 accent-indigo-600"
                          checked={Number(correctIndex) === index}
                          onChange={() => form.setValue("correctIndex", index, { shouldDirty: true })}
                        />
                        {t("optionLabel", { label: String.fromCharCode(65 + index) })}
                        {Number(correctIndex) === index ? (
                          <span className="text-success text-sm font-medium">{t("correct")}</span>
                        ) : null}
                      </label>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={options.fields.length <= MCQ_MIN_OPTIONS}
                        onClick={() => {
                          options.remove(index);
                          if (Number(correctIndex) >= index && Number(correctIndex) > 0)
                            form.setValue("correctIndex", Number(correctIndex) - 1);
                        }}
                        aria-label={t("removeOption", { label: String.fromCharCode(65 + index) })}
                      >
                        <Trash2 aria-hidden="true" />
                      </Button>
                    </div>
                    <div className="grid gap-4 lg:grid-cols-2">
                      {(["bn", "en"] as const).map((lang) => (
                        <div key={lang} className="space-y-2">
                          <FormField
                            id={`q-option-${index}-${lang}`}
                            label={t(`lang.${lang}`)}
                            error={fieldError(errors.options?.[index]?.[lang === "bn" ? "textBn" : "textEn"])}
                          >
                            <Textarea
                              lang={lang}
                              rows={2}
                              className="min-h-14"
                              {...form.register(`options.${index}.${lang === "bn" ? "textBn" : "textEn"}`)}
                            />
                          </FormField>
                          <OptionPreview control={form.control} index={index} lang={lang} />
                        </div>
                      ))}
                    </div>
                  </li>
                ))}
              </ol>
            </fieldset>
            {fieldError(errors.options) || fieldError(errors.correctIndex) ? (
              <p className="text-danger text-sm font-medium" role="alert">
                {text(fieldError(errors.options) ?? fieldError(errors.correctIndex))}
              </p>
            ) : null}
            <Button
              variant="secondary"
              disabled={options.fields.length >= MCQ_MAX_OPTIONS}
              onClick={() => options.append({ textBn: "", textEn: "" })}
            >
              <Plus aria-hidden="true" />
              {t("addOption")}
            </Button>
            <BilingualField
              form={form}
              idPrefix="q-explanation"
              label={t("explanation")}
              bn="explanationBn"
              en="explanationEn"
            />
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>{t("sections.answer")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-3">
                <FormField id="q-answer-mode" label={t("answerMode")}>
                  <Select {...form.register("answerMode")}>
                    {WRITTEN_ANSWER_MODES.map((m) => (
                      <option key={m} value={m}>
                        {tLabels(`answerModes.${m}`)}
                      </option>
                    ))}
                  </Select>
                </FormField>
                <FormField
                  id="q-word-limit"
                  label={t("wordLimit")}
                  optional
                  error={fieldError(errors.wordLimit)}
                >
                  <Input
                    type="number"
                    inputMode="numeric"
                    min="1"
                    {...form.register("wordLimit", {
                      setValueAs: (v: string) => (v === "" ? "" : Number(v)),
                    })}
                  />
                </FormField>
                <FormField
                  id="q-char-limit"
                  label={t("charLimit")}
                  optional
                  error={fieldError(errors.charLimit)}
                >
                  <Input
                    type="number"
                    inputMode="numeric"
                    min="1"
                    {...form.register("charLimit", {
                      setValueAs: (v: string) => (v === "" ? "" : Number(v)),
                    })}
                  />
                </FormField>
              </div>
              <BilingualField
                form={form}
                idPrefix="q-model"
                label={t("modelAnswer")}
                bn="modelAnswerBn"
                en="modelAnswerEn"
                rows={5}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t("sections.rubric")}</CardTitle>
              <p className="text-muted-foreground text-sm" role="status">
                {t("rubricTotal", { total: rubricTotal, marks: Number(marks) || 0 })}
              </p>
            </CardHeader>
            <CardContent className="space-y-5">
              <BilingualField
                form={form}
                idPrefix="q-guidance"
                label={t("guidance")}
                bn="guidanceBn"
                en="guidanceEn"
                rows={2}
              />
              <ol className="space-y-4">
                {criteria.fields.map((field, index) => (
                  <li key={field.id} className="border-border rounded-xl border p-4">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <p className="font-semibold">{t("criterionLabel", { number: index + 1 })}</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => criteria.remove(index)}
                        aria-label={t("removeCriterion", { number: index + 1 })}
                      >
                        <Trash2 aria-hidden="true" />
                      </Button>
                    </div>
                    <div className="grid gap-4 lg:grid-cols-[1fr_1fr_8rem]">
                      <FormField
                        id={`q-criterion-${index}-bn`}
                        label={t("lang.bn")}
                        error={fieldError(errors.criteria?.[index]?.textBn)}
                      >
                        <Input lang="bn" {...form.register(`criteria.${index}.textBn`)} />
                      </FormField>
                      <FormField
                        id={`q-criterion-${index}-en`}
                        label={t("lang.en")}
                        error={fieldError(errors.criteria?.[index]?.textEn)}
                      >
                        <Input lang="en" {...form.register(`criteria.${index}.textEn`)} />
                      </FormField>
                      <FormField
                        id={`q-criterion-${index}-marks`}
                        label={t("criterionMarks")}
                        error={fieldError(errors.criteria?.[index]?.maxMarks)}
                      >
                        <Input
                          type="number"
                          inputMode="decimal"
                          step="0.25"
                          min="0.25"
                          {...form.register(`criteria.${index}.maxMarks`, { valueAsNumber: true })}
                        />
                      </FormField>
                    </div>
                  </li>
                ))}
              </ol>
              {fieldError(errors.criteria) ? (
                <p className="text-danger text-sm font-medium" role="alert">
                  {text(fieldError(errors.criteria))}
                </p>
              ) : null}
              <Button
                variant="secondary"
                onClick={() => criteria.append({ textBn: "", textEn: "", maxMarks: 1 })}
              >
                <Plus aria-hidden="true" />
                {t("addCriterion")}
              </Button>
            </CardContent>
          </Card>
        </>
      )}

      <div className="border-border bg-background/95 sticky bottom-0 z-10 -mx-4 flex flex-wrap gap-2 border-t px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-xl sm:border">
        <Button type="submit" disabled={pending}>
          {pending ? <Spinner label={t("saving")} /> : null}
          {t("saveDraft")}
        </Button>
        <Button asChild variant="secondary">
          <Link href={questionId ? `${basePath}/${questionId}` : basePath}>{t("cancel")}</Link>
        </Button>
      </div>
    </form>
  );
}

function OptionPreview({
  control,
  index,
  lang,
}: {
  control: Control<QuestionFormInput>;
  index: number;
  lang: "bn" | "en";
}) {
  const t = useTranslations("questionForms");
  const value = useWatch({ control, name: `options.${index}.${lang === "bn" ? "textBn" : "textEn"}` });
  if (!value?.trim()) return null;
  return (
    <div
      className="border-border bg-surface-muted/50 rounded-lg border border-dashed p-2.5 text-sm"
      aria-label={t("preview")}
    >
      <MathText text={value} lang={lang} />
    </div>
  );
}

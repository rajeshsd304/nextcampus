import { ClipboardCheck, FilePlus2, FileSpreadsheet, FileWarning, PenLine } from "lucide-react";
import Link from "next/link";
import { forbidden, notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { getFormatContext } from "@/features/preferences/server";
import { formatDateTime, formatNumber } from "@/lib/i18n-format";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AssetManager } from "./components/asset-manager";
import { ImportForm } from "./components/import-form";
import { DifficultyBadge, LanguageBadges, StatusBadge, TypeBadge } from "./components/question-badges";
import { QuestionEditor } from "./components/question-editor";
import { QuestionFilters } from "./components/question-filters";
import { QuestionList } from "./components/question-list";
import { QuestionView } from "./components/question-view";
import { RevisionHistory } from "./components/revision-history";
import { TransitionControls } from "./components/transition-controls";
import { IMPORT_COLUMNS } from "./import/csv";
import { emptyQuestionForm, type QuestionFormInput } from "./schemas";
import { requireBank, type BankContext, type BankRef } from "./server/context";
import { filtersToQuery, parseQuestionFilters } from "./server/filters";
import {
  countInReview,
  getQuestionDetail,
  listQuestions,
  listRevisions,
  loadTaxonomy,
  type QuestionDetail,
} from "./server/queries";

type SearchParams = Record<string, string | string[] | undefined>;

function canEditDetail(context: BankContext, detail: QuestionDetail): boolean {
  return (
    detail.question.status === "draft" &&
    (context.canReview || (context.canAuthor && detail.question.created_by === context.viewer.user.id))
  );
}

async function BankHeader({
  context,
  title,
  description,
}: {
  context: BankContext;
  title: string;
  description: string;
}) {
  const t = await getTranslations("questions");
  const fmt = await getFormatContext(context.viewer.profile.timezone);
  const pending = context.canReview ? await countInReview(context) : 0;
  return (
    <PageHeader
      eyebrow={context.isPublicBank ? t("bank.public") : t("bank.private")}
      title={title}
      description={description}
      actions={
        <>
          {context.canReview ? (
            <Button asChild variant="secondary">
              <Link href={`${context.basePath}/review`}>
                <ClipboardCheck aria-hidden="true" />
                {t("nav.review", { count: formatNumber(pending, fmt) })}
              </Link>
            </Button>
          ) : null}
          {context.canAuthor ? (
            <>
              <Button asChild variant="secondary">
                <Link href={`${context.basePath}/import`}>
                  <FileSpreadsheet aria-hidden="true" />
                  {t("nav.import")}
                </Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href={`${context.basePath}/new?type=written`}>
                  <PenLine aria-hidden="true" />
                  {t("nav.newWritten")}
                </Link>
              </Button>
              <Button asChild>
                <Link href={`${context.basePath}/new?type=mcq`}>
                  <FilePlus2 aria-hidden="true" />
                  {t("nav.newMcq")}
                </Link>
              </Button>
            </>
          ) : null}
        </>
      }
    />
  );
}

export async function QuestionBankPage({
  bank,
  searchParams,
  review = false,
}: {
  bank: BankRef;
  searchParams: SearchParams;
  review?: boolean;
}) {
  const context = await requireBank(bank);
  if (review && !context.canReview) forbidden();
  const t = await getTranslations("questions");
  const filters = {
    ...parseQuestionFilters(searchParams),
    ...(review ? { status: "in_review" as const } : {}),
  };
  const cursor = typeof searchParams.cursor === "string" ? searchParams.cursor : undefined;
  const [fmt, taxonomy, page] = await Promise.all([
    getFormatContext(context.viewer.profile.timezone),
    loadTaxonomy(),
    listQuestions(context, filters, cursor),
  ]);
  const listPath = review ? `${context.basePath}/review` : context.basePath;
  const query = review ? { ...filters, status: undefined } : filters;

  return (
    <div className="space-y-6">
      <BankHeader
        context={context}
        title={review ? t("review.title") : t("list.title")}
        description={review ? t("review.description") : t("list.description")}
      />
      <QuestionFilters taxonomy={taxonomy} filters={query} action={listPath} hideStatus={review} />
      <QuestionList
        items={page.items}
        taxonomy={taxonomy}
        basePath={context.basePath}
        format={fmt}
        emptyAction={
          !review && context.canAuthor ? (
            <Button asChild>
              <Link href={`${context.basePath}/new?type=mcq`}>{t("nav.newMcq")}</Link>
            </Button>
          ) : undefined
        }
      />
      {cursor || page.nextCursor ? (
        <nav aria-label={t("list.pagination")} className="flex flex-wrap justify-between gap-2">
          {cursor ? (
            <Button asChild variant="secondary" size="sm">
              <Link href={`${listPath}${filtersToQuery(query)}`}>{t("list.firstPage")}</Link>
            </Button>
          ) : (
            <span />
          )}
          {page.nextCursor ? (
            <Button asChild variant="secondary" size="sm">
              <Link href={`${listPath}${filtersToQuery(query, { cursor: page.nextCursor })}`}>
                {t("list.nextPage")}
              </Link>
            </Button>
          ) : null}
        </nav>
      ) : null}
    </div>
  );
}

export async function NewQuestionPage({ bank, type }: { bank: BankRef; type: string | undefined }) {
  const context = await requireBank(bank);
  if (!context.canAuthor) forbidden();
  const [t, taxonomy] = await Promise.all([getTranslations("questions"), loadTaxonomy()]);
  const questionType = type === "written" ? "written" : "mcq";
  const firstTopic = taxonomy.topics.find((topic) =>
    taxonomy.subjects.some((s) => s.id === topic.subject_id),
  );

  return (
    <div className="space-y-6">
      <PageHeader title={t(`editor.new.${questionType}`)} description={t("editor.newDescription")} />
      {!firstTopic ? (
        <EmptyState
          icon={<FileWarning />}
          title={t("editor.noTaxonomyTitle")}
          description={t("editor.noTaxonomyBody")}
        />
      ) : (
        <QuestionEditor
          bank={bank}
          basePath={context.basePath}
          taxonomy={taxonomy}
          defaults={emptyQuestionForm(questionType, {
            subjectId: firstTopic.subject_id,
            topicId: firstTopic.id,
          })}
        />
      )}
    </div>
  );
}

function toFormInput(detail: QuestionDetail): QuestionFormInput {
  const { question, options, answerKey, spec, modelAnswer, rubric, criteria } = detail;
  return {
    type: question.type,
    subjectId: question.subject_id,
    topicId: question.topic_id,
    examTargetId: question.exam_target_id ?? "",
    difficulty: question.difficulty,
    marks: Number(question.marks),
    stemBn: question.stem_bn,
    stemEn: question.stem_en,
    sourceNote: question.source_note ?? "",
    options: options.map((o) => ({ textBn: o.text_bn, textEn: o.text_en })),
    correctIndex: Math.max(
      0,
      options.findIndex((o) => o.id === answerKey?.correct_option_id),
    ),
    explanationBn: answerKey?.explanation_bn ?? "",
    explanationEn: answerKey?.explanation_en ?? "",
    answerMode: spec?.answer_mode ?? "text",
    wordLimit: spec?.word_limit ?? "",
    charLimit: spec?.char_limit ?? "",
    modelAnswerBn: modelAnswer?.answer_bn ?? "",
    modelAnswerEn: modelAnswer?.answer_en ?? "",
    guidanceBn: rubric?.guidance_bn ?? "",
    guidanceEn: rubric?.guidance_en ?? "",
    criteria: criteria.map((c) => ({ textBn: c.text_bn, textEn: c.text_en, maxMarks: Number(c.max_marks) })),
  };
}

export async function QuestionDetailPage({ bank, id }: { bank: BankRef; id: string }) {
  const context = await requireBank(bank);
  const [t, fmt, detail] = await Promise.all([
    getTranslations("questions"),
    getFormatContext(context.viewer.profile.timezone),
    getQuestionDetail(context, id),
  ]);
  if (!detail) notFound();
  const revisions = await listRevisions(id);
  const { question } = detail;
  const canEdit = canEditDetail(context, detail);

  return (
    <div className="space-y-6">
      <nav aria-label={t("breadcrumb")}>
        <Link
          href={context.basePath}
          className="text-muted-foreground hover:text-foreground inline-flex min-h-11 items-center text-sm"
        >
          {t("back")}
        </Link>
      </nav>
      <PageHeader
        title={t(`detail.title.${question.type}`)}
        description={t("detail.meta", {
          author: detail.creatorLabel ?? t("detail.unknownAuthor"),
          date: formatDateTime(question.updated_at, fmt),
        })}
        actions={
          canEdit ? (
            <Button asChild>
              <Link href={`${context.basePath}/${id}/edit`}>{t("detail.edit")}</Link>
            </Button>
          ) : null
        }
      />
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={question.status} />
        <TypeBadge type={question.type} />
        <DifficultyBadge difficulty={question.difficulty} />
        <LanguageBadges bn={question.bn_complete} en={question.en_complete} />
        <span className="text-muted-foreground text-sm">
          {t("list.marks", { marks: formatNumber(Number(question.marks), fmt) })}
        </span>
        {question.published_at ? (
          <span className="text-muted-foreground text-sm">
            {t("detail.published", { date: formatDateTime(question.published_at, fmt) })}
          </span>
        ) : null}
      </div>
      <TransitionControls
        bank={bank}
        questionId={id}
        status={question.status}
        canEdit={canEdit}
        canReview={context.canReview}
        isCreator={question.created_by === context.viewer.user.id}
      />
      {context.isPublicBank && question.status === "in_review" && !context.canReview ? (
        <Alert tone="info">{t("detail.publicReviewNote")}</Alert>
      ) : null}
      <QuestionView detail={detail} format={fmt} />
      <Card>
        <CardHeader>
          <CardTitle>{t("history.title")}</CardTitle>
          <CardDescription>{t("history.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <RevisionHistory revisions={revisions} format={fmt} />
        </CardContent>
      </Card>
    </div>
  );
}

export async function EditQuestionPage({ bank, id }: { bank: BankRef; id: string }) {
  const context = await requireBank(bank);
  const [t, taxonomy, detail] = await Promise.all([
    getTranslations("questions"),
    loadTaxonomy(),
    getQuestionDetail(context, id),
  ]);
  if (!detail) notFound();
  if (!canEditDetail(context, detail)) {
    return (
      <div className="space-y-6">
        <PageHeader title={t("editor.edit")} />
        <Alert tone="warning" title={t("editor.notEditableTitle")}>
          {detail.question.status === "draft" ? t("editor.notYourDraft") : t("editor.notDraft")}
        </Alert>
        <Button asChild variant="secondary">
          <Link href={`${context.basePath}/${id}`}>{t("editor.viewQuestion")}</Link>
        </Button>
      </div>
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data: duplicates } = await supabase.rpc("find_duplicate_questions", {
    p_owner_org_id: context.orgId,
    p_stem_bn: detail.question.stem_bn || null,
    p_stem_en: detail.question.stem_en || null,
    p_exclude: id,
  });

  return (
    <div className="space-y-6">
      <nav aria-label={t("breadcrumb")}>
        <Link
          href={`${context.basePath}/${id}`}
          className="text-muted-foreground hover:text-foreground inline-flex min-h-11 items-center text-sm"
        >
          {t("editor.backToQuestion")}
        </Link>
      </nav>
      <PageHeader title={t("editor.edit")} description={t("editor.editDescription")} />
      {duplicates && duplicates.length > 0 ? (
        <Alert tone="warning" title={t("editor.duplicatesTitle", { count: duplicates.length })}>
          <ul className="mt-1 flex flex-wrap gap-2">
            {duplicates.map((d, index) => (
              <li key={d.question_id}>
                <Link
                  href={`${context.basePath}/${d.question_id}`}
                  className="inline-flex min-h-11 items-center font-medium underline"
                >
                  {t("editor.duplicateLink", { number: index + 1 })}
                </Link>
              </li>
            ))}
          </ul>
        </Alert>
      ) : null}
      <QuestionEditor
        bank={bank}
        basePath={context.basePath}
        questionId={id}
        defaults={toFormInput(detail)}
        taxonomy={taxonomy}
      />
      <Card>
        <CardHeader>
          <CardTitle>{t("editor.imagesTitle")}</CardTitle>
          <CardDescription>{t("editor.imagesDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <AssetManager
            bank={bank}
            questionId={id}
            assets={detail.assets.map((a) => ({ id: a.id, url: a.url, altBn: a.alt_bn, altEn: a.alt_en }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}

export async function ImportPage({ bank }: { bank: BankRef }) {
  const context = await requireBank(bank);
  if (!context.canAuthor) forbidden();
  const t = await getTranslations("questions.import");
  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("description")} />
      <ImportForm bank={bank} basePath={context.basePath} />
      <Card>
        <CardHeader>
          <CardTitle>{t("guideTitle")}</CardTitle>
          <CardDescription>{t("guideDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <ul className="list-disc space-y-1.5 pl-5">
            {(["rows", "slugs", "mcq", "written", "idempotent", "limits"] as const).map((key) => (
              <li key={key}>{t(`guide.${key}`)}</li>
            ))}
          </ul>
          <details>
            <summary className="inline-flex min-h-11 cursor-pointer items-center font-medium">
              {t("allColumns")}
            </summary>
            <p className="text-muted-foreground font-mono text-xs break-all" lang="en">
              {IMPORT_COLUMNS.join(", ")}
            </p>
          </details>
        </CardContent>
      </Card>
    </div>
  );
}

-- Rollback for 20261031000100_question_bank.sql. DESTROYS question bank data —
-- export it first. Question images in the private `question-assets` bucket are
-- NOT deleted by this script: remove them through the Storage API (or the
-- dashboard) and then delete the bucket. Audit history is kept (append-only).
begin;

drop policy if exists question_assets_storage_select on storage.objects;
drop policy if exists question_assets_storage_insert on storage.objects;

drop view if exists public.student_written_specs;
drop view if exists public.student_question_options;
drop view if exists public.student_questions;

-- Revisions are append-only; lift the guard to drop them.
drop trigger if exists question_revisions_no_update on public.question_revisions;

drop table if exists public.question_revisions;
drop table if exists public.question_assets;
drop table if exists public.rubric_criteria;
drop table if exists public.rubrics;
drop table if exists public.model_answers;
drop table if exists public.written_question_specs;
drop table if exists public.question_answer_keys;
drop table if exists public.question_options;
drop table if exists public.questions;

drop function if exists private.can_upload_question_asset(text);
drop function if exists private.can_read_question_asset(text);
drop function if exists private.question_id_from_asset_path(text);
drop function if exists private.can_edit_question(uuid);
drop function if exists private.can_review_in(uuid);
drop function if exists private.can_author_in(uuid);
drop function if exists private.can_read_question_internals_by_id(uuid);
drop function if exists private.can_read_question_by_id(uuid);
drop function if exists private.can_read_question(uuid, public.question_status);
drop function if exists private.can_read_question_internals(uuid);
drop function if exists private.check_question_asset_owner();
drop function if exists private.check_question_integrity();
drop function if exists private.assert_question_integrity(uuid);
drop function if exists private.question_revisions_immutable();
drop function if exists private.questions_before_write();
drop function if exists private.stem_hash(text);
drop function if exists private.normalize_stem(text);
drop function if exists private.content_setting_int(text, integer);

drop table if exists public.content_settings;
drop table if exists public.topics;
drop function if exists private.check_topic_parent();

drop type if exists public.written_answer_mode;
drop type if exists public.question_difficulty;
drop type if exists public.question_status;
drop type if exists public.question_type;

delete from public.permissions where key in ('questions.read', 'questions.author', 'questions.review');

commit;

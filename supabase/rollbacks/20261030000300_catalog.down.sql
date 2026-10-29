-- Rollback for 20261030000300_catalog.sql. DESTROYS catalog data — export it first:
--   pg_dump "$DATABASE_URL" --data-only -t 'public.university*' -t public.subjects -t 'public.exam_target*'
-- Audit history of catalog changes is kept (append-only).
begin;
drop function if exists public.move_catalog_item(text, text, text);
drop function if exists public.set_exam_target_subjects(uuid, uuid[]);
drop table if exists public.exam_target_subjects;
drop table if exists public.exam_targets;
drop table if exists public.subjects;
drop table if exists public.universities;
drop table if exists public.university_categories;
drop function if exists private.audit_catalog_change();
commit;

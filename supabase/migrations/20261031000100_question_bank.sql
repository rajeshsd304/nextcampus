-- NextCampus Phase 2: question bank content model.
--
-- Design (the Phase 3 exam player depends on this — see README › Question bank):
--   * A question is owned by one organization (`owner_org_id`). Questions owned
--     by the system organization form the PUBLIC BANK; all others are private
--     to their organization and never readable outside it.
--   * Correctness is stored apart from content. `question_options` has no
--     "is correct" column; the single correct option and explanations live in
--     `question_answer_keys`. Model answers and rubrics are likewise separate.
--     Those tables are readable only by authors/reviewers of the owner org and
--     platform admins — never by students, whatever the question status.
--   * Students (members of the owner org) can read PUBLISHED content through
--     `student_questions` / `student_question_options` / `student_written_specs`,
--     which structurally contain no answer data.
--   * Integrity is enforced in the database with DEFERRED constraint triggers
--     (checked at commit): an MCQ has 2–6 options labelled A–F and exactly one
--     answer key pointing at one of its own options; a written question has a
--     spec, and its rubric criteria marks sum to the question marks.
--   * All writes go through SECURITY DEFINER RPCs (20261031000200); API roles
--     have no INSERT/UPDATE/DELETE privileges on content tables.
--   * Every content edit or status change appends an immutable revision.
--
-- Rollback: supabase/rollbacks/20261031000100_question_bank.down.sql

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.question_type as enum ('mcq', 'written');
create type public.question_status as enum ('draft', 'in_review', 'published', 'archived');
create type public.question_difficulty as enum ('easy', 'medium', 'hard');
create type public.written_answer_mode as enum ('text', 'image', 'both');

-- ---------------------------------------------------------------------------
-- Topics (catalog reference data, per subject, optional hierarchy)
-- ---------------------------------------------------------------------------

create table public.topics (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects (id) on delete restrict,
  parent_id uuid references public.topics (id) on delete restrict,
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{0,78}[a-z0-9]$' and slug !~ '--'),
  name_en text not null check (char_length(btrim(name_en)) between 2 and 120),
  name_bn text not null check (char_length(btrim(name_bn)) between 2 and 120),
  is_active boolean not null default true,
  sort_order integer not null default 0 check (sort_order between 0 and 100000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (parent_id is null or parent_id <> id)
);

create index topics_subject_idx on public.topics (subject_id, sort_order);
create index topics_parent_idx on public.topics (parent_id);

create trigger topics_set_updated_at before update on public.topics
for each row execute function private.set_updated_at();

-- A parent topic must belong to the same subject, and the tree must stay acyclic.
create function private.check_topic_parent()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_parent_subject uuid;
  v_cursor uuid := new.parent_id;
  v_depth integer := 0;
begin
  if new.parent_id is null then
    return new;
  end if;
  select t.subject_id into v_parent_subject from public.topics t where t.id = new.parent_id;
  if v_parent_subject is distinct from new.subject_id then
    raise exception 'topic_parent_subject_mismatch' using errcode = '23514';
  end if;
  while v_cursor is not null loop
    if v_cursor = new.id then
      raise exception 'topic_cycle' using errcode = '23514';
    end if;
    v_depth := v_depth + 1;
    if v_depth > 10 then
      raise exception 'topic_too_deep' using errcode = '23514';
    end if;
    select t.parent_id into v_cursor from public.topics t where t.id = v_cursor;
  end loop;
  return new;
end;
$$;

create trigger topics_check_parent before insert or update of parent_id, subject_id on public.topics
for each row execute function private.check_topic_parent();

create trigger topics_audit after insert or update or delete on public.topics
for each row execute function private.audit_catalog_change('topic');

alter table public.topics enable row level security;

create policy topics_select_anon on public.topics
  for select to anon using (is_active and exists (select 1 from public.subjects s where s.id = subject_id));
create policy topics_select on public.topics
  for select to authenticated using (is_active or (select private.is_super_admin()));
create policy topics_write on public.topics
  for all to authenticated
  using ((select private.is_super_admin()))
  with check ((select private.is_super_admin()));

revoke all on public.topics from anon, authenticated;
grant select on public.topics to anon, authenticated;
grant insert (subject_id, parent_id, slug, name_en, name_bn, is_active, sort_order) on public.topics to authenticated;
grant update (subject_id, parent_id, slug, name_en, name_bn, is_active, sort_order) on public.topics to authenticated;
grant delete on public.topics to authenticated;

-- ---------------------------------------------------------------------------
-- Content settings (configurable publishing rules)
-- ---------------------------------------------------------------------------

create table public.content_settings (
  key text primary key check (key ~ '^[a-z][a-z0-9_]{1,63}$'),
  value jsonb not null,
  description text not null check (char_length(description) <= 500),
  updated_at timestamptz not null default now()
);

create trigger content_settings_set_updated_at before update on public.content_settings
for each row execute function private.set_updated_at();
create trigger content_settings_audit after insert or update or delete on public.content_settings
for each row execute function private.audit_catalog_change('content_setting');

-- Language completeness required at each step: 1 = at least one of bn/en,
-- 2 = both. Platform admins may change these values (see README).
insert into public.content_settings (key, value, description) values
  ('question_review_min_languages', '1', 'Complete languages (1 or 2) required to submit a question for review.'),
  ('question_org_publish_min_languages', '1', 'Complete languages (1 or 2) required to publish an organization-private question.'),
  ('question_public_publish_min_languages', '2', 'Complete languages (1 or 2) required to publish to the public bank.');

alter table public.content_settings
  add constraint content_settings_language_rule_check
  check (key not like 'question\_%\_min\_languages' or value in ('1'::jsonb, '2'::jsonb));

alter table public.content_settings enable row level security;
create policy content_settings_select on public.content_settings for select to authenticated using (true);
create policy content_settings_update on public.content_settings
  for update to authenticated
  using ((select private.is_super_admin()))
  with check ((select private.is_super_admin()));
revoke all on public.content_settings from anon, authenticated;
grant select on public.content_settings to authenticated;
grant update (value) on public.content_settings to authenticated;

create function private.content_setting_int(p_key text, p_default integer)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select (s.value #>> '{}')::integer from public.content_settings s where s.key = p_key), p_default);
$$;

-- ---------------------------------------------------------------------------
-- Questions and parts
-- ---------------------------------------------------------------------------

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  owner_org_id uuid not null references public.organizations (id) on delete restrict,
  type public.question_type not null,
  status public.question_status not null default 'draft',
  difficulty public.question_difficulty not null default 'medium',
  exam_target_id uuid references public.exam_targets (id) on delete restrict,
  subject_id uuid not null references public.subjects (id) on delete restrict,
  topic_id uuid not null references public.topics (id) on delete restrict,
  stem_bn text not null default '' check (char_length(stem_bn) <= 5000),
  stem_en text not null default '' check (char_length(stem_en) <= 5000),
  marks numeric(5, 2) not null default 1 check (marks > 0 and marks <= 100),
  source_note text check (source_note is null or char_length(source_note) <= 500),
  -- External id from CSV import; makes re-import idempotent per organization.
  import_key text check (import_key is null or import_key ~ '^[A-Za-z0-9._:-]{1,100}$'),
  -- Maintained by triggers / save_question; used for duplicate warnings and list filters.
  stem_hash_bn text,
  stem_hash_en text,
  bn_complete boolean not null default false,
  en_complete boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null,
  reviewed_by uuid references public.profiles (id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_org_id, import_key),
  check (status <> 'published' or published_at is not null)
);

create index questions_bank_list_idx on public.questions (owner_org_id, updated_at desc, id desc);
create index questions_status_idx on public.questions (owner_org_id, status);
create index questions_subject_idx on public.questions (subject_id, topic_id);
create index questions_exam_target_idx on public.questions (exam_target_id);
create index questions_stem_hash_bn_idx on public.questions (stem_hash_bn) where stem_hash_bn is not null;
create index questions_stem_hash_en_idx on public.questions (stem_hash_en) where stem_hash_en is not null;
create index questions_created_by_idx on public.questions (created_by);

create trigger questions_set_updated_at before update on public.questions
for each row execute function private.set_updated_at();

create function private.normalize_stem(p_text text)
returns text
language sql
immutable
set search_path = ''
as $$
  select btrim(regexp_replace(
    regexp_replace(lower(normalize(coalesce(p_text, ''), NFKC)), '[[:punct:]$\\]+', ' ', 'g'),
    '\s+', ' ', 'g'
  ));
$$;

create function private.stem_hash(p_text text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when private.normalize_stem(p_text) = '' then null
    else encode(sha256(convert_to(private.normalize_stem(p_text), 'UTF8')), 'hex')
  end;
$$;

-- Keeps hashes in sync and enforces that the topic belongs to the subject.
create function private.questions_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.stem_hash_bn := private.stem_hash(new.stem_bn);
  new.stem_hash_en := private.stem_hash(new.stem_en);
  if not exists (select 1 from public.topics t where t.id = new.topic_id and t.subject_id = new.subject_id) then
    raise exception 'topic_subject_mismatch' using errcode = 'P0001';
  end if;
  if tg_op = 'UPDATE' and new.type <> old.type then
    raise exception 'question_type_immutable' using errcode = 'P0001';
  end if;
  if tg_op = 'UPDATE' and new.owner_org_id <> old.owner_org_id then
    raise exception 'question_owner_immutable' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger questions_before_write before insert or update on public.questions
for each row execute function private.questions_before_write();

create table public.question_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions (id) on delete cascade,
  sort_order smallint not null check (sort_order between 1 and 6),
  label text not null,
  text_bn text not null default '' check (char_length(text_bn) <= 2000),
  text_en text not null default '' check (char_length(text_en) <= 2000),
  unique (question_id, sort_order),
  unique (question_id, label),
  unique (question_id, id),
  -- Labels are A–F in order; together with sort_order this caps options at 6.
  check (label = chr(64 + sort_order))
);

create table public.question_answer_keys (
  question_id uuid primary key references public.questions (id) on delete cascade,
  correct_option_id uuid not null,
  explanation_bn text not null default '' check (char_length(explanation_bn) <= 5000),
  explanation_en text not null default '' check (char_length(explanation_en) <= 5000),
  -- The correct option must be one of this question's own options. A single
  -- row per question makes "exactly one correct option" structural.
  foreign key (question_id, correct_option_id)
    references public.question_options (question_id, id)
    on delete cascade
    deferrable initially deferred
);

create table public.written_question_specs (
  question_id uuid primary key references public.questions (id) on delete cascade,
  answer_mode public.written_answer_mode not null default 'text',
  word_limit integer check (word_limit is null or word_limit between 1 and 5000),
  char_limit integer check (char_limit is null or char_limit between 1 and 50000)
);

create table public.model_answers (
  question_id uuid primary key references public.questions (id) on delete cascade,
  answer_bn text not null default '' check (char_length(answer_bn) <= 10000),
  answer_en text not null default '' check (char_length(answer_en) <= 10000)
);

create table public.rubrics (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null unique references public.questions (id) on delete cascade,
  guidance_bn text not null default '' check (char_length(guidance_bn) <= 2000),
  guidance_en text not null default '' check (char_length(guidance_en) <= 2000),
  created_at timestamptz not null default now()
);

create table public.rubric_criteria (
  id uuid primary key default gen_random_uuid(),
  rubric_id uuid not null references public.rubrics (id) on delete cascade,
  sort_order smallint not null check (sort_order between 1 and 20),
  text_bn text not null default '' check (char_length(text_bn) <= 1000),
  text_en text not null default '' check (char_length(text_en) <= 1000),
  max_marks numeric(5, 2) not null check (max_marks > 0 and max_marks <= 100),
  unique (rubric_id, sort_order)
);

create table public.question_assets (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions (id) on delete cascade,
  owner_org_id uuid not null references public.organizations (id) on delete restrict,
  storage_path text not null unique,
  mime_type text not null check (mime_type in ('image/png', 'image/jpeg', 'image/webp')),
  size_bytes integer not null check (size_bytes between 1 and 2097152),
  alt_bn text not null default '' check (char_length(alt_bn) <= 300),
  alt_en text not null default '' check (char_length(alt_en) <= 300),
  sort_order smallint not null default 1 check (sort_order between 1 and 20),
  uploaded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  -- Objects live under <owner_org_id>/<question_id>/<uuid>.<ext> in the private bucket.
  check (storage_path = owner_org_id::text || '/' || question_id::text || '/' || split_part(storage_path, '/', 3)),
  check (split_part(storage_path, '/', 3) ~ '^[0-9a-f-]{36}\.(png|jpg|jpeg|webp)$')
);

create index question_assets_question_idx on public.question_assets (question_id, sort_order);

create table public.question_revisions (
  id bigint generated always as identity primary key,
  question_id uuid not null references public.questions (id) on delete restrict,
  revision integer not null check (revision >= 1),
  change_kind text not null check (change_kind in ('created', 'content', 'status')),
  from_status public.question_status,
  to_status public.question_status not null,
  reason text check (reason is null or char_length(reason) <= 1000),
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object'),
  actor_id uuid,
  created_at timestamptz not null default now(),
  unique (question_id, revision)
);

create function private.question_revisions_immutable()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'question_revisions_are_append_only' using errcode = '42501';
end;
$$;

create trigger question_revisions_no_update before update or delete on public.question_revisions
for each row execute function private.question_revisions_immutable();

-- ---------------------------------------------------------------------------
-- Integrity (deferred: checked once per transaction, at commit)
-- ---------------------------------------------------------------------------

create function private.assert_question_integrity(p_question_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_question record;
  v_options integer;
  v_criteria integer;
  v_criteria_total numeric;
begin
  select q.id, q.type, q.status, q.marks into v_question from public.questions q where q.id = p_question_id;
  if not found then
    return;
  end if;

  if v_question.type = 'mcq' then
    select count(*) into v_options from public.question_options o where o.question_id = p_question_id;
    if v_options < 2 or v_options > 6 then
      raise exception 'mcq_option_count' using errcode = '23514';
    end if;
    if not exists (select 1 from public.question_answer_keys k where k.question_id = p_question_id) then
      raise exception 'mcq_answer_key_required' using errcode = '23514';
    end if;
    if exists (select 1 from public.written_question_specs s where s.question_id = p_question_id)
      or exists (select 1 from public.model_answers m where m.question_id = p_question_id)
      or exists (select 1 from public.rubrics r where r.question_id = p_question_id) then
      raise exception 'question_type_mismatch' using errcode = '23514';
    end if;
  else
    if not exists (select 1 from public.written_question_specs s where s.question_id = p_question_id) then
      raise exception 'written_spec_required' using errcode = '23514';
    end if;
    if exists (select 1 from public.question_options o where o.question_id = p_question_id)
      or exists (select 1 from public.question_answer_keys k where k.question_id = p_question_id) then
      raise exception 'question_type_mismatch' using errcode = '23514';
    end if;
    select count(c.id), coalesce(sum(c.max_marks), 0) into v_criteria, v_criteria_total
    from public.rubrics r join public.rubric_criteria c on c.rubric_id = r.id
    where r.question_id = p_question_id;
    if v_criteria > 0 and v_criteria_total <> v_question.marks then
      raise exception 'rubric_marks_mismatch' using errcode = '23514';
    end if;
    if v_question.status <> 'draft' and v_criteria = 0 then
      raise exception 'rubric_required' using errcode = '23514';
    end if;
  end if;
end;
$$;

create function private.check_question_integrity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row jsonb := to_jsonb(coalesce(new, old));
  v_question_id uuid;
begin
  if tg_table_name = 'questions' then
    v_question_id := (v_row ->> 'id')::uuid;
  elsif tg_table_name = 'rubric_criteria' then
    select r.question_id into v_question_id from public.rubrics r where r.id = (v_row ->> 'rubric_id')::uuid;
  else
    v_question_id := (v_row ->> 'question_id')::uuid;
  end if;
  if v_question_id is not null then
    perform private.assert_question_integrity(v_question_id);
  end if;
  return null;
end;
$$;

create constraint trigger questions_integrity after insert or update on public.questions
deferrable initially deferred for each row execute function private.check_question_integrity();
create constraint trigger question_options_integrity after insert or update or delete on public.question_options
deferrable initially deferred for each row execute function private.check_question_integrity();
create constraint trigger question_answer_keys_integrity after insert or update or delete on public.question_answer_keys
deferrable initially deferred for each row execute function private.check_question_integrity();
create constraint trigger written_question_specs_integrity after insert or update or delete on public.written_question_specs
deferrable initially deferred for each row execute function private.check_question_integrity();
create constraint trigger model_answers_integrity after insert or update or delete on public.model_answers
deferrable initially deferred for each row execute function private.check_question_integrity();
create constraint trigger rubrics_integrity after insert or update or delete on public.rubrics
deferrable initially deferred for each row execute function private.check_question_integrity();
create constraint trigger rubric_criteria_integrity after insert or update or delete on public.rubric_criteria
deferrable initially deferred for each row execute function private.check_question_integrity();

create function private.check_question_asset_owner()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (select 1 from public.questions q where q.id = new.question_id and q.owner_org_id = new.owner_org_id) then
    raise exception 'question_asset_owner_mismatch' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger question_assets_check_owner before insert or update on public.question_assets
for each row execute function private.check_question_asset_owner();

-- ---------------------------------------------------------------------------
-- Authorization helpers
-- ---------------------------------------------------------------------------

-- Authors and reviewers of the owner organization, and platform admins.
create function private.can_read_question_internals(p_owner_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_super_admin() or private.has_org_permission(p_owner_org_id, 'questions.read');
$$;

-- Content visibility: internals readers, plus members of the owner org once published.
create function private.can_read_question(p_owner_org_id uuid, p_status public.question_status)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.can_read_question_internals(p_owner_org_id)
    or (p_status = 'published' and private.is_org_member(p_owner_org_id));
$$;

create function private.can_read_question_by_id(p_question_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.questions q
    where q.id = p_question_id and private.can_read_question(q.owner_org_id, q.status)
  );
$$;

create function private.can_read_question_internals_by_id(p_question_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.questions q
    where q.id = p_question_id and private.can_read_question_internals(q.owner_org_id)
  );
$$;

-- May create questions in an organization: authors there, or platform admins in the public bank.
create function private.can_author_in(p_owner_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.has_org_permission(p_owner_org_id, 'questions.author')
    or (private.is_super_admin() and private.is_system_organization(p_owner_org_id));
$$;

-- Reviewers: org admins for private content; ONLY platform admins for the public bank.
create function private.can_review_in(p_owner_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when private.is_system_organization(p_owner_org_id) then private.is_super_admin()
    else private.has_org_permission(p_owner_org_id, 'questions.review')
  end;
$$;

-- Drafts are editable by their creator (if still an author), by reviewers, and
-- by platform admins for the public bank.
create function private.can_edit_question(p_question_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.questions q
    where q.id = p_question_id
      and q.status = 'draft'
      and (
        private.can_review_in(q.owner_org_id)
        or (private.is_super_admin() and private.is_system_organization(q.owner_org_id))
        or (q.created_by = (select auth.uid()) and private.has_org_permission(q.owner_org_id, 'questions.author'))
      )
  );
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security (read-only for API roles; writes are RPC-only)
-- ---------------------------------------------------------------------------

alter table public.questions enable row level security;
alter table public.question_options enable row level security;
alter table public.question_answer_keys enable row level security;
alter table public.written_question_specs enable row level security;
alter table public.model_answers enable row level security;
alter table public.rubrics enable row level security;
alter table public.rubric_criteria enable row level security;
alter table public.question_assets enable row level security;
alter table public.question_revisions enable row level security;

create policy questions_select on public.questions
  for select to authenticated using (private.can_read_question(owner_org_id, status));
create policy question_options_select on public.question_options
  for select to authenticated using (private.can_read_question_by_id(question_id));
create policy written_question_specs_select on public.written_question_specs
  for select to authenticated using (private.can_read_question_by_id(question_id));
create policy question_assets_select on public.question_assets
  for select to authenticated using (private.can_read_question_by_id(question_id));

-- Answer data: authors/reviewers/platform admins only — never students.
create policy question_answer_keys_select on public.question_answer_keys
  for select to authenticated using (private.can_read_question_internals_by_id(question_id));
create policy model_answers_select on public.model_answers
  for select to authenticated using (private.can_read_question_internals_by_id(question_id));
create policy rubrics_select on public.rubrics
  for select to authenticated using (private.can_read_question_internals_by_id(question_id));
create policy rubric_criteria_select on public.rubric_criteria
  for select to authenticated using (
    exists (select 1 from public.rubrics r where r.id = rubric_id and private.can_read_question_internals_by_id(r.question_id))
  );
create policy question_revisions_select on public.question_revisions
  for select to authenticated using (private.can_read_question_internals_by_id(question_id));

revoke all on public.questions, public.question_options, public.question_answer_keys, public.written_question_specs,
  public.model_answers, public.rubrics, public.rubric_criteria, public.question_assets, public.question_revisions
  from anon, authenticated;

grant select on public.questions, public.question_options, public.question_answer_keys, public.written_question_specs,
  public.model_answers, public.rubrics, public.rubric_criteria, public.question_assets, public.question_revisions
  to authenticated;

-- ---------------------------------------------------------------------------
-- Student-safe views (no answer keys, explanations, model answers or rubrics)
-- ---------------------------------------------------------------------------

create view public.student_questions with (security_invoker = true) as
  select q.id, q.owner_org_id, q.type, q.difficulty, q.exam_target_id, q.subject_id, q.topic_id,
         q.stem_bn, q.stem_en, q.marks, q.published_at
  from public.questions q
  where q.status = 'published';

create view public.student_question_options with (security_invoker = true) as
  select o.id, o.question_id, o.label, o.text_bn, o.text_en, o.sort_order
  from public.question_options o
  join public.questions q on q.id = o.question_id
  where q.status = 'published';

create view public.student_written_specs with (security_invoker = true) as
  select s.question_id, s.answer_mode, s.word_limit, s.char_limit
  from public.written_question_specs s
  join public.questions q on q.id = s.question_id
  where q.status = 'published';

revoke all on public.student_questions, public.student_question_options, public.student_written_specs from anon, authenticated;
grant select on public.student_questions, public.student_question_options, public.student_written_specs to authenticated;

-- ---------------------------------------------------------------------------
-- Permissions (mirrored in src/features/access/permissions.ts)
-- ---------------------------------------------------------------------------

insert into public.permissions (key, description) values
  ('questions.read', 'View the organization question bank, including answer keys and rubrics'),
  ('questions.author', 'Create questions and edit own drafts'),
  ('questions.review', 'Approve, reject and archive organization questions');

insert into public.role_permissions (role, permission_key) values
  ('org_admin', 'questions.read'),
  ('org_admin', 'questions.author'),
  ('org_admin', 'questions.review'),
  ('instructor', 'questions.read'),
  ('instructor', 'questions.author'),
  ('invigilator', 'questions.read'),
  ('invigilator', 'questions.author');

-- ---------------------------------------------------------------------------
-- Private storage for question images: <owner_org_id>/<question_id>/<uuid>.<ext>
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('question-assets', 'question-assets', false, 2097152, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

create function private.question_id_from_asset_path(p_path text)
returns uuid
language sql
immutable
set search_path = ''
as $$
  select case
    when p_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.(png|jpg|jpeg|webp)$'
    then split_part(p_path, '/', 2)::uuid
  end;
$$;

create function private.can_upload_question_asset(p_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.questions q
    where q.id = private.question_id_from_asset_path(p_path)
      and q.owner_org_id::text = split_part(p_path, '/', 1)
      and private.can_edit_question(q.id)
  );
$$;

create function private.can_read_question_asset(p_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.questions q
    where q.id = private.question_id_from_asset_path(p_path)
      and q.owner_org_id::text = split_part(p_path, '/', 1)
      and private.can_read_question(q.owner_org_id, q.status)
  );
$$;

create policy question_assets_storage_select on storage.objects
  for select to authenticated
  using (bucket_id = 'question-assets' and private.can_read_question_asset(name));

create policy question_assets_storage_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'question-assets' and private.can_upload_question_asset(name));

-- ---------------------------------------------------------------------------
-- Function privileges
-- ---------------------------------------------------------------------------

revoke all on all functions in schema private from public;
grant execute on function private.is_super_admin() to authenticated;
grant execute on function private.is_org_member(uuid) to authenticated;
grant execute on function private.has_org_permission(uuid, text) to authenticated;
grant execute on function private.can_view_profile(uuid) to authenticated;
grant execute on function private.can_read_roster(uuid) to authenticated;
grant execute on function private.can_read_question(uuid, public.question_status) to authenticated;
grant execute on function private.can_read_question_by_id(uuid) to authenticated;
grant execute on function private.can_read_question_internals_by_id(uuid) to authenticated;
grant execute on function private.can_read_question_asset(text) to authenticated;
grant execute on function private.can_upload_question_asset(text) to authenticated;

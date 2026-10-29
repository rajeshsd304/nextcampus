-- NextCampus Phase 1.5: admission-test catalog (reference data).
--
-- Tables: university_categories (lookup; new categories need no deploy),
-- universities, subjects, exam_targets, exam_target_subjects.
--
-- Access
--   * Read: anon + authenticated see ACTIVE rows only (a university is visible
--     only if its category is active; an exam target only if its university is
--     visible). Platform admins see everything.
--   * Write: platform admins only, enforced by RLS. Insert/update use column
--     grants so created_at/updated_at are always database-assigned.
--   * Every change is audited by trigger (actor = auth.uid(), time = now()).
--   * Referenced rows cannot be deleted (FK RESTRICT) — deactivate instead.
--
-- Data lives in supabase/reference-data/catalog.sql (idempotent, safe in any
-- environment), not in this migration.
--
-- Rollback: supabase/rollbacks/20261030000300_catalog.down.sql

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.university_categories (
  key text primary key check (key ~ '^[a-z][a-z0-9_]{1,39}$'),
  name_en text not null check (char_length(btrim(name_en)) between 2 and 80),
  name_bn text not null check (char_length(btrim(name_bn)) between 2 and 80),
  sort_order integer not null default 0 check (sort_order between 0 and 100000),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.universities (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{0,58}[a-z0-9]$' and slug !~ '--'),
  name_en text not null check (char_length(btrim(name_en)) between 2 and 160),
  name_bn text not null check (char_length(btrim(name_bn)) between 2 and 160),
  short_code text not null check (char_length(btrim(short_code)) between 1 and 16),
  category_key text not null references public.university_categories (key) on update cascade on delete restrict,
  website text check (website is null or (website ~ '^https?://[^\s]+$' and char_length(website) <= 2048)),
  is_active boolean not null default true,
  sort_order integer not null default 0 check (sort_order between 0 and 100000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index universities_category_idx on public.universities (category_key);
create index universities_active_order_idx on public.universities (is_active, sort_order);

create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{0,58}[a-z0-9]$' and slug !~ '--'),
  name_en text not null check (char_length(btrim(name_en)) between 2 and 80),
  name_bn text not null check (char_length(btrim(name_bn)) between 2 and 80),
  is_active boolean not null default true,
  sort_order integer not null default 0 check (sort_order between 0 and 100000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.exam_targets (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities (id) on delete restrict,
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{0,78}[a-z0-9]$' and slug !~ '--'),
  name_en text not null check (char_length(btrim(name_en)) between 2 and 160),
  name_bn text not null check (char_length(btrim(name_bn)) between 2 and 160),
  description_en text check (description_en is null or char_length(description_en) <= 2000),
  description_bn text check (description_bn is null or char_length(description_bn) <= 2000),
  typical_format_en text check (typical_format_en is null or char_length(typical_format_en) <= 1000),
  typical_format_bn text check (typical_format_bn is null or char_length(typical_format_bn) <= 1000),
  -- Marks deducted per wrong MCQ answer (0.25 = a quarter mark).
  negative_marking numeric(4, 2) not null default 0.25 check (negative_marking between 0 and 1),
  is_active boolean not null default true,
  sort_order integer not null default 0 check (sort_order between 0 and 100000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index exam_targets_university_idx on public.exam_targets (university_id);
create index exam_targets_active_order_idx on public.exam_targets (is_active, sort_order);

create table public.exam_target_subjects (
  exam_target_id uuid not null references public.exam_targets (id) on delete cascade,
  subject_id uuid not null references public.subjects (id) on delete restrict,
  primary key (exam_target_id, subject_id)
);

create index exam_target_subjects_subject_idx on public.exam_target_subjects (subject_id);

create trigger university_categories_set_updated_at before update on public.university_categories
for each row execute function private.set_updated_at();
create trigger universities_set_updated_at before update on public.universities
for each row execute function private.set_updated_at();
create trigger subjects_set_updated_at before update on public.subjects
for each row execute function private.set_updated_at();
create trigger exam_targets_set_updated_at before update on public.exam_targets
for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- Audit trigger (shared)
-- ---------------------------------------------------------------------------

create function private.audit_catalog_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_entity text := tg_argv[0];
  v_old jsonb := case when tg_op = 'INSERT' then null else to_jsonb(old) end;
  v_new jsonb := case when tg_op = 'DELETE' then null else to_jsonb(new) end;
  v_row jsonb := coalesce(v_new, v_old);
  v_changes jsonb := '{}'::jsonb;
  v_key text;
  v_action text;
begin
  if tg_op = 'INSERT' then
    v_action := v_entity || '.created';
  elsif tg_op = 'DELETE' then
    v_action := v_entity || '.deleted';
  else
    for v_key in select jsonb_object_keys(v_new) loop
      if v_key not in ('updated_at', 'created_at') and (v_new -> v_key) is distinct from (v_old -> v_key) then
        v_changes := v_changes || jsonb_build_object(v_key, jsonb_build_object('from', v_old -> v_key, 'to', v_new -> v_key));
      end if;
    end loop;

    if v_changes = '{}'::jsonb then
      return null;
    end if;

    if v_changes ? 'is_active' then
      v_action := v_entity || case when (v_new ->> 'is_active')::boolean then '.activated' else '.deactivated' end;
    elsif v_changes ?& array['sort_order'] and (select count(*) from jsonb_object_keys(v_changes)) = 1 then
      -- Bulk reorders are audited once by public.move_catalog_item().
      if current_setting('nextcampus.catalog_reorder', true) = 'on' then
        return null;
      end if;
      v_action := v_entity || '.reordered';
    else
      v_action := v_entity || '.updated';
    end if;
  end if;

  insert into public.audit_logs (organization_id, actor_id, action, target_type, target_id, metadata)
  values (
    null,
    auth.uid(),
    v_action,
    v_entity,
    coalesce(v_row ->> 'id', v_row ->> 'key'),
    jsonb_strip_nulls(jsonb_build_object(
      'slug', coalesce(v_row ->> 'slug', v_row ->> 'key'),
      'name_en', v_row ->> 'name_en',
      'changes', case when v_changes = '{}'::jsonb then null else v_changes end
    ))
  );
  return null;
end;
$$;

create trigger university_categories_audit after insert or update or delete on public.university_categories
for each row execute function private.audit_catalog_change('university_category');
create trigger universities_audit after insert or update or delete on public.universities
for each row execute function private.audit_catalog_change('university');
create trigger subjects_audit after insert or update or delete on public.subjects
for each row execute function private.audit_catalog_change('subject');
create trigger exam_targets_audit after insert or update or delete on public.exam_targets
for each row execute function private.audit_catalog_change('exam_target');

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.university_categories enable row level security;
alter table public.universities enable row level security;
alter table public.subjects enable row level security;
alter table public.exam_targets enable row level security;
alter table public.exam_target_subjects enable row level security;

-- Read: anonymous visitors see active rows.
create policy university_categories_select_anon on public.university_categories
  for select to anon using (is_active);
create policy universities_select_anon on public.universities
  for select to anon using (
    is_active and exists (select 1 from public.university_categories c where c.key = category_key)
  );
create policy subjects_select_anon on public.subjects
  for select to anon using (is_active);
create policy exam_targets_select_anon on public.exam_targets
  for select to anon using (
    is_active and exists (select 1 from public.universities u where u.id = university_id)
  );
create policy exam_target_subjects_select_anon on public.exam_target_subjects
  for select to anon using (
    exists (select 1 from public.exam_targets t where t.id = exam_target_id)
    and exists (select 1 from public.subjects s where s.id = subject_id)
  );

-- Read: signed-in users see active rows; platform admins see everything.
-- (Nested EXISTS subqueries are themselves filtered by RLS, so visibility
-- cascades: inactive category → hidden universities → hidden targets.)
create policy university_categories_select on public.university_categories
  for select to authenticated using (is_active or (select private.is_super_admin()));
create policy universities_select on public.universities
  for select to authenticated using (
    (is_active and exists (select 1 from public.university_categories c where c.key = category_key and c.is_active))
    or (select private.is_super_admin())
  );
create policy subjects_select on public.subjects
  for select to authenticated using (is_active or (select private.is_super_admin()));
create policy exam_targets_select on public.exam_targets
  for select to authenticated using (
    (is_active and exists (select 1 from public.universities u where u.id = university_id and u.is_active))
    or (select private.is_super_admin())
  );
create policy exam_target_subjects_select on public.exam_target_subjects
  for select to authenticated using (
    exists (select 1 from public.exam_targets t where t.id = exam_target_id)
    and exists (select 1 from public.subjects s where s.id = subject_id)
  );

-- Write: platform admins only.
create policy university_categories_write on public.university_categories
  for all to authenticated
  using ((select private.is_super_admin()))
  with check ((select private.is_super_admin()));
create policy universities_write on public.universities
  for all to authenticated
  using ((select private.is_super_admin()))
  with check ((select private.is_super_admin()));
create policy subjects_write on public.subjects
  for all to authenticated
  using ((select private.is_super_admin()))
  with check ((select private.is_super_admin()));
create policy exam_targets_write on public.exam_targets
  for all to authenticated
  using ((select private.is_super_admin()))
  with check ((select private.is_super_admin()));

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------

-- Replaces an exam target's subject list atomically, with one audit entry.
create function public.set_exam_target_subjects(p_exam_target_id uuid, p_subject_ids uuid[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_before jsonb;
  v_after jsonb;
begin
  perform private.require_user();
  if not private.is_super_admin() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  if not exists (select 1 from public.exam_targets t where t.id = p_exam_target_id) then
    raise exception 'catalog_item_not_found' using errcode = 'P0001';
  end if;
  if coalesce(array_length(p_subject_ids, 1), 0) > 50 then
    raise exception 'invalid_input' using errcode = 'P0001';
  end if;

  select coalesce(jsonb_agg(s.slug order by s.slug), '[]'::jsonb) into v_before
  from public.exam_target_subjects ets join public.subjects s on s.id = ets.subject_id
  where ets.exam_target_id = p_exam_target_id;

  delete from public.exam_target_subjects ets where ets.exam_target_id = p_exam_target_id;
  insert into public.exam_target_subjects (exam_target_id, subject_id)
  select p_exam_target_id, s.id
  from public.subjects s
  where s.id = any (coalesce(p_subject_ids, array[]::uuid[]));

  select coalesce(jsonb_agg(s.slug order by s.slug), '[]'::jsonb) into v_after
  from public.exam_target_subjects ets join public.subjects s on s.id = ets.subject_id
  where ets.exam_target_id = p_exam_target_id;

  if v_before is distinct from v_after then
    perform private.write_audit(
      null, 'exam_target.subjects_changed', 'exam_target', p_exam_target_id::text,
      jsonb_build_object('from', v_before, 'to', v_after)
    );
  end if;
end;
$$;

-- Moves a catalog row one position up/down. Rows are renumbered (10, 20, …)
-- first so ties never block a move. Audited once.
create function public.move_catalog_item(p_entity text, p_id text, p_direction text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_table text;
  v_key_column text;
  v_ids text[];
  v_index integer;
  v_swap integer;
begin
  perform private.require_user();
  if not private.is_super_admin() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  if p_direction not in ('up', 'down') then
    raise exception 'invalid_input' using errcode = 'P0001';
  end if;

  case p_entity
    when 'university_category' then v_table := 'university_categories'; v_key_column := 'key';
    when 'university' then v_table := 'universities'; v_key_column := 'id';
    when 'subject' then v_table := 'subjects'; v_key_column := 'id';
    when 'exam_target' then v_table := 'exam_targets'; v_key_column := 'id';
    else raise exception 'invalid_input' using errcode = 'P0001';
  end case;

  execute format(
    'select array_agg(%1$I::text order by sort_order, created_at, %1$I) from public.%2$I',
    v_key_column, v_table
  ) into v_ids;

  v_index := array_position(v_ids, p_id);
  if v_index is null then
    raise exception 'catalog_item_not_found' using errcode = 'P0001';
  end if;
  v_swap := case when p_direction = 'up' then v_index - 1 else v_index + 1 end;
  if v_swap < 1 or v_swap > array_length(v_ids, 1) then
    return;
  end if;

  v_ids[v_index] := v_ids[v_swap];
  v_ids[v_swap] := p_id;

  perform set_config('nextcampus.catalog_reorder', 'on', true);
  execute format(
    'update public.%1$I t set sort_order = o.position * 10
       from unnest($1::text[]) with ordinality as o(item, position)
      where t.%2$I::text = o.item and t.sort_order <> o.position * 10',
    v_table, v_key_column
  ) using v_ids;
  perform set_config('nextcampus.catalog_reorder', 'off', true);

  perform private.write_audit(
    null, p_entity || '.reordered', p_entity, p_id, jsonb_build_object('direction', p_direction)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------

revoke all on public.university_categories, public.universities, public.subjects,
  public.exam_targets, public.exam_target_subjects from anon, authenticated;

grant select on public.university_categories, public.universities, public.subjects,
  public.exam_targets, public.exam_target_subjects to anon, authenticated;

grant insert (key, name_en, name_bn, sort_order, is_active) on public.university_categories to authenticated;
grant update (key, name_en, name_bn, sort_order, is_active) on public.university_categories to authenticated;
grant delete on public.university_categories to authenticated;

grant insert (slug, name_en, name_bn, short_code, category_key, website, is_active, sort_order)
  on public.universities to authenticated;
grant update (slug, name_en, name_bn, short_code, category_key, website, is_active, sort_order)
  on public.universities to authenticated;
grant delete on public.universities to authenticated;

grant insert (slug, name_en, name_bn, is_active, sort_order) on public.subjects to authenticated;
grant update (slug, name_en, name_bn, is_active, sort_order) on public.subjects to authenticated;
grant delete on public.subjects to authenticated;

grant insert (
  university_id, slug, name_en, name_bn, description_en, description_bn,
  typical_format_en, typical_format_bn, negative_marking, is_active, sort_order
) on public.exam_targets to authenticated;
grant update (
  university_id, slug, name_en, name_bn, description_en, description_bn,
  typical_format_en, typical_format_bn, negative_marking, is_active, sort_order
) on public.exam_targets to authenticated;
grant delete on public.exam_targets to authenticated;

revoke all on function private.audit_catalog_change() from public;

revoke all on function public.set_exam_target_subjects(uuid, uuid[]) from public, anon, authenticated;
grant execute on function public.set_exam_target_subjects(uuid, uuid[]) to authenticated;
revoke all on function public.move_catalog_item(text, text, text) from public, anon, authenticated;
grant execute on function public.move_catalog_item(text, text, text) to authenticated;

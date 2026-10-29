-- NextCampus Phase 2: question bank RPCs (the only write path for content).
--
--   save_question(id?, owner_org, payload)  create or edit a DRAFT atomically,
--                                            append a revision, audit
--   transition_question(id, action, reason)  the status state machine:
--       submit   draft      → in_review   editors; language rule
--       withdraw in_review  → draft       creator or reviewer
--       reject   in_review  → draft       reviewer; reason required
--       publish  in_review  → published   reviewer (public bank: platform admin only); language rule
--       archive  published  → archived    reviewer
--       restore  archived   → draft       reviewer
--   add_question_asset / remove_question_asset   images on drafts
--   find_duplicate_questions                      normalized-stem matches (warning only)
--
-- Every function derives the actor from auth.uid(), validates, authorizes, uses
-- now() for timestamps and writes an audit entry.
--
-- Rollback: supabase/rollbacks/20261031000200_question_rpcs.down.sql

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create function private.question_language_complete(p_question_id uuid, p_lang text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_question record;
  v_blank boolean;
begin
  select q.type, q.stem_bn, q.stem_en into v_question from public.questions q where q.id = p_question_id;
  if not found then
    return false;
  end if;
  if btrim(case p_lang when 'bn' then v_question.stem_bn else v_question.stem_en end) = '' then
    return false;
  end if;

  if v_question.type = 'mcq' then
    select exists (
      select 1 from public.question_options o
      where o.question_id = p_question_id and btrim(case p_lang when 'bn' then o.text_bn else o.text_en end) = ''
    ) into v_blank;
    if v_blank then
      return false;
    end if;
    return exists (
      select 1 from public.question_answer_keys k
      where k.question_id = p_question_id
        and btrim(case p_lang when 'bn' then k.explanation_bn else k.explanation_en end) <> ''
    );
  end if;

  if not exists (
    select 1 from public.model_answers m
    where m.question_id = p_question_id and btrim(case p_lang when 'bn' then m.answer_bn else m.answer_en end) <> ''
  ) then
    return false;
  end if;
  select exists (
    select 1 from public.rubrics r join public.rubric_criteria c on c.rubric_id = r.id
    where r.question_id = p_question_id and btrim(case p_lang when 'bn' then c.text_bn else c.text_en end) = ''
  ) into v_blank;
  return not v_blank;
end;
$$;

create function private.question_snapshot(p_question_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'type', q.type,
    'status', q.status,
    'difficulty', q.difficulty,
    'subject_id', q.subject_id,
    'topic_id', q.topic_id,
    'exam_target_id', q.exam_target_id,
    'marks', q.marks,
    'stem_bn', q.stem_bn,
    'stem_en', q.stem_en,
    'source_note', q.source_note,
    'options', coalesce((
      select jsonb_agg(jsonb_build_object('label', o.label, 'text_bn', o.text_bn, 'text_en', o.text_en) order by o.sort_order)
      from public.question_options o where o.question_id = q.id
    ), '[]'::jsonb),
    'answer_key', (
      select jsonb_build_object('correct_label', o.label, 'explanation_bn', k.explanation_bn, 'explanation_en', k.explanation_en)
      from public.question_answer_keys k join public.question_options o on o.id = k.correct_option_id
      where k.question_id = q.id
    ),
    'written_spec', (
      select jsonb_build_object('answer_mode', s.answer_mode, 'word_limit', s.word_limit, 'char_limit', s.char_limit)
      from public.written_question_specs s where s.question_id = q.id
    ),
    'model_answer', (
      select jsonb_build_object('answer_bn', m.answer_bn, 'answer_en', m.answer_en)
      from public.model_answers m where m.question_id = q.id
    ),
    'rubric', (
      select jsonb_build_object(
        'guidance_bn', r.guidance_bn,
        'guidance_en', r.guidance_en,
        'criteria', coalesce((
          select jsonb_agg(jsonb_build_object('text_bn', c.text_bn, 'text_en', c.text_en, 'max_marks', c.max_marks) order by c.sort_order)
          from public.rubric_criteria c where c.rubric_id = r.id
        ), '[]'::jsonb)
      )
      from public.rubrics r where r.question_id = q.id
    ),
    'assets', coalesce((
      select jsonb_agg(jsonb_build_object('path', a.storage_path, 'alt_bn', a.alt_bn, 'alt_en', a.alt_en) order by a.sort_order, a.created_at)
      from public.question_assets a where a.question_id = q.id
    ), '[]'::jsonb)
  )
  from public.questions q
  where q.id = p_question_id;
$$;

-- Appends a revision unless a content snapshot is identical to the latest one.
-- Returns the current revision number.
create function private.record_question_revision(
  p_question_id uuid,
  p_kind text,
  p_from public.question_status,
  p_to public.question_status,
  p_reason text
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_snapshot jsonb := private.question_snapshot(p_question_id);
  v_latest record;
begin
  select r.revision, r.snapshot into v_latest
  from public.question_revisions r
  where r.question_id = p_question_id
  order by r.revision desc
  limit 1;

  if p_kind = 'content' and v_latest.snapshot = v_snapshot then
    return v_latest.revision;
  end if;

  insert into public.question_revisions (question_id, revision, change_kind, from_status, to_status, reason, snapshot, actor_id)
  values (p_question_id, coalesce(v_latest.revision, 0) + 1, p_kind, p_from, p_to, p_reason, v_snapshot, auth.uid());
  return coalesce(v_latest.revision, 0) + 1;
end;
$$;

create function private.refresh_question_completeness(p_question_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.questions q
  set bn_complete = private.question_language_complete(q.id, 'bn'),
      en_complete = private.question_language_complete(q.id, 'en')
  where q.id = p_question_id
    and (q.bn_complete, q.en_complete)
      is distinct from (private.question_language_complete(q.id, 'bn'), private.question_language_complete(q.id, 'en'));
$$;

create function private.question_duplicates(p_question_id uuid, p_owner_org_id uuid, p_hash_bn text, p_hash_en text)
returns uuid[]
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(array_agg(q.id order by q.created_at), '{}')
  from public.questions q
  where (p_question_id is null or q.id <> p_question_id)
    and (
      q.owner_org_id = p_owner_org_id
      or (q.status = 'published' and private.is_system_organization(q.owner_org_id))
    )
    and ((p_hash_bn is not null and q.stem_hash_bn = p_hash_bn) or (p_hash_en is not null and q.stem_hash_en = p_hash_en));
$$;

-- ---------------------------------------------------------------------------
-- save_question
-- ---------------------------------------------------------------------------

create function public.save_question(p_question_id uuid, p_owner_org_id uuid, p_payload jsonb)
returns table (question_id uuid, revision integer, duplicate_ids uuid[])
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  v_id uuid := p_question_id;
  v_existing record;
  v_type public.question_type;
  v_is_new boolean := p_question_id is null;
  v_options jsonb;
  v_option jsonb;
  v_option_id uuid;
  v_index integer;
  v_correct integer;
  v_correct_id uuid;
  v_rubric_id uuid;
  v_criterion jsonb;
  v_revision integer;
  v_import_key text := nullif(btrim(coalesce(p_payload ->> 'import_key', '')), '');
begin
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'invalid_input' using errcode = 'P0001';
  end if;

  begin
    v_type := (p_payload ->> 'type')::public.question_type;
  exception when invalid_text_representation then
    raise exception 'invalid_input' using errcode = 'P0001';
  end;
  if v_type is null then
    raise exception 'invalid_input' using errcode = 'P0001';
  end if;

  if v_is_new then
    if not private.can_author_in(p_owner_org_id) then
      raise exception 'not_authorized' using errcode = '42501';
    end if;
  else
    select q.id, q.owner_org_id, q.type, q.status into v_existing
    from public.questions q where q.id = p_question_id for update;
    -- Do not reveal questions in other organizations.
    if not found or not private.can_read_question_internals(v_existing.owner_org_id) then
      raise exception 'question_not_found' using errcode = 'P0001';
    end if;
    if v_existing.status <> 'draft' then
      raise exception 'question_not_editable' using errcode = 'P0001';
    end if;
    if not private.can_edit_question(p_question_id) then
      raise exception 'not_authorized' using errcode = '42501';
    end if;
    if v_existing.type <> v_type then
      raise exception 'question_type_immutable' using errcode = 'P0001';
    end if;
  end if;

  begin
    if v_is_new then
      insert into public.questions (
        owner_org_id, type, difficulty, exam_target_id, subject_id, topic_id, stem_bn, stem_en, marks, source_note,
        import_key, created_by
      ) values (
        p_owner_org_id,
        v_type,
        coalesce((p_payload ->> 'difficulty')::public.question_difficulty, 'medium'),
        nullif(p_payload ->> 'exam_target_id', '')::uuid,
        (p_payload ->> 'subject_id')::uuid,
        (p_payload ->> 'topic_id')::uuid,
        coalesce(p_payload ->> 'stem_bn', ''),
        coalesce(p_payload ->> 'stem_en', ''),
        coalesce((p_payload ->> 'marks')::numeric, 1),
        nullif(btrim(coalesce(p_payload ->> 'source_note', '')), ''),
        v_import_key,
        v_uid
      )
      returning id into v_id;
    else
      update public.questions q set
        difficulty = coalesce((p_payload ->> 'difficulty')::public.question_difficulty, q.difficulty),
        exam_target_id = nullif(p_payload ->> 'exam_target_id', '')::uuid,
        subject_id = (p_payload ->> 'subject_id')::uuid,
        topic_id = (p_payload ->> 'topic_id')::uuid,
        stem_bn = coalesce(p_payload ->> 'stem_bn', ''),
        stem_en = coalesce(p_payload ->> 'stem_en', ''),
        marks = coalesce((p_payload ->> 'marks')::numeric, q.marks),
        source_note = nullif(btrim(coalesce(p_payload ->> 'source_note', '')), '')
      where q.id = v_id;
    end if;
  exception
    when invalid_text_representation or numeric_value_out_of_range or not_null_violation or check_violation then
      raise exception 'invalid_input' using errcode = 'P0001';
    when foreign_key_violation then
      raise exception 'invalid_reference' using errcode = 'P0001';
    when unique_violation then
      raise exception 'import_key_taken' using errcode = 'P0001';
  end;

  if v_type = 'mcq' then
    v_options := p_payload #> '{mcq,options}';
    if v_options is null or jsonb_typeof(v_options) <> 'array'
      or jsonb_array_length(v_options) < 2 or jsonb_array_length(v_options) > 6 then
      raise exception 'mcq_option_count' using errcode = 'P0001';
    end if;
    v_correct := (p_payload #>> '{mcq,correct_index}')::integer;
    if v_correct is null or v_correct < 0 or v_correct >= jsonb_array_length(v_options) then
      raise exception 'mcq_answer_key_required' using errcode = 'P0001';
    end if;

    delete from public.question_answer_keys k where k.question_id = v_id;
    delete from public.question_options o where o.question_id = v_id;
    v_index := 0;
    for v_option in select value from jsonb_array_elements(v_options) loop
      insert into public.question_options (question_id, sort_order, label, text_bn, text_en)
      values (v_id, v_index + 1, chr(65 + v_index), coalesce(v_option ->> 'text_bn', ''), coalesce(v_option ->> 'text_en', ''))
      returning id into v_option_id;
      if v_index = v_correct then
        v_correct_id := v_option_id;
      end if;
      v_index := v_index + 1;
    end loop;
    insert into public.question_answer_keys (question_id, correct_option_id, explanation_bn, explanation_en)
    values (v_id, v_correct_id, coalesce(p_payload #>> '{mcq,explanation_bn}', ''), coalesce(p_payload #>> '{mcq,explanation_en}', ''));
  else
    insert into public.written_question_specs (question_id, answer_mode, word_limit, char_limit)
    values (
      v_id,
      coalesce((p_payload #>> '{written,answer_mode}')::public.written_answer_mode, 'text'),
      nullif(p_payload #>> '{written,word_limit}', '')::integer,
      nullif(p_payload #>> '{written,char_limit}', '')::integer
    )
    on conflict on constraint written_question_specs_pkey do update
      set answer_mode = excluded.answer_mode, word_limit = excluded.word_limit, char_limit = excluded.char_limit;

    insert into public.model_answers (question_id, answer_bn, answer_en)
    values (v_id, coalesce(p_payload #>> '{written,model_answer_bn}', ''), coalesce(p_payload #>> '{written,model_answer_en}', ''))
    on conflict on constraint model_answers_pkey do update
      set answer_bn = excluded.answer_bn, answer_en = excluded.answer_en;

    insert into public.rubrics (question_id, guidance_bn, guidance_en)
    values (v_id, coalesce(p_payload #>> '{written,guidance_bn}', ''), coalesce(p_payload #>> '{written,guidance_en}', ''))
    on conflict on constraint rubrics_question_id_key do update
      set guidance_bn = excluded.guidance_bn, guidance_en = excluded.guidance_en
    returning id into v_rubric_id;

    if jsonb_typeof(coalesce(p_payload #> '{written,criteria}', '[]'::jsonb)) <> 'array'
      or jsonb_array_length(coalesce(p_payload #> '{written,criteria}', '[]'::jsonb)) > 20 then
      raise exception 'invalid_input' using errcode = 'P0001';
    end if;
    delete from public.rubric_criteria c where c.rubric_id = v_rubric_id;
    v_index := 0;
    for v_criterion in select value from jsonb_array_elements(coalesce(p_payload #> '{written,criteria}', '[]'::jsonb)) loop
      v_index := v_index + 1;
      insert into public.rubric_criteria (rubric_id, sort_order, text_bn, text_en, max_marks)
      values (v_rubric_id, v_index, coalesce(v_criterion ->> 'text_bn', ''), coalesce(v_criterion ->> 'text_en', ''),
              (v_criterion ->> 'max_marks')::numeric);
    end loop;
  end if;

  -- Surface integrity errors now (with a clear code) rather than at commit.
  perform private.assert_question_integrity(v_id);
  perform private.refresh_question_completeness(v_id);

  v_revision := private.record_question_revision(
    v_id, case when v_is_new then 'created' else 'content' end, null, 'draft', null
  );

  perform private.write_audit(
    p_owner_org_id, case when v_is_new then 'question.created' else 'question.updated' end,
    'question', v_id::text,
    jsonb_strip_nulls(jsonb_build_object('type', v_type, 'revision', v_revision, 'import_key', v_import_key))
  );

  return query
    select v_id, v_revision,
           private.question_duplicates(v_id, p_owner_org_id, q.stem_hash_bn, q.stem_hash_en)
    from public.questions q where q.id = v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- transition_question
-- ---------------------------------------------------------------------------

create function public.transition_question(p_question_id uuid, p_action text, p_reason text default null)
returns public.question_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  v_q record;
  v_to public.question_status;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_languages integer;
  v_required integer;
  v_is_public boolean;
begin
  select q.id, q.owner_org_id, q.status, q.created_by, q.type into v_q
  from public.questions q where q.id = p_question_id for update;
  if not found or not private.can_read_question_internals(v_q.owner_org_id) then
    raise exception 'question_not_found' using errcode = 'P0001';
  end if;
  v_is_public := private.is_system_organization(v_q.owner_org_id);

  if v_reason is not null and char_length(v_reason) > 1000 then
    raise exception 'invalid_input' using errcode = 'P0001';
  end if;

  -- The state machine: (action, from) → to. Anything else is illegal.
  v_to := case
    when p_action = 'submit' and v_q.status = 'draft' then 'in_review'
    when p_action = 'withdraw' and v_q.status = 'in_review' then 'draft'
    when p_action = 'reject' and v_q.status = 'in_review' then 'draft'
    when p_action = 'publish' and v_q.status = 'in_review' then 'published'
    when p_action = 'archive' and v_q.status = 'published' then 'archived'
    when p_action = 'restore' and v_q.status = 'archived' then 'draft'
  end::public.question_status;
  if v_to is null then
    raise exception 'invalid_transition' using errcode = 'P0001';
  end if;

  -- Authorization per action.
  if p_action = 'submit' then
    if not private.can_edit_question(p_question_id) then
      raise exception 'not_authorized' using errcode = '42501';
    end if;
  elsif p_action = 'withdraw' then
    if not (private.can_review_in(v_q.owner_org_id)
      or (v_q.created_by = v_uid and private.can_author_in(v_q.owner_org_id))) then
      raise exception 'not_authorized' using errcode = '42501';
    end if;
  elsif not private.can_review_in(v_q.owner_org_id) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  if p_action = 'reject' and (v_reason is null or char_length(v_reason) < 3) then
    raise exception 'reason_required' using errcode = 'P0001';
  end if;

  -- Language completeness rules (configurable in content_settings).
  if p_action in ('submit', 'publish') then
    v_languages := private.question_language_complete(p_question_id, 'bn')::integer
                 + private.question_language_complete(p_question_id, 'en')::integer;
    v_required := case
      when p_action = 'submit' then private.content_setting_int('question_review_min_languages', 1)
      when v_is_public then private.content_setting_int('question_public_publish_min_languages', 2)
      else private.content_setting_int('question_org_publish_min_languages', 1)
    end;
    if v_languages < v_required then
      raise exception '%', case when v_required >= 2 then 'both_languages_required' else 'language_incomplete' end
        using errcode = 'P0001';
    end if;
  end if;

  update public.questions q set
    status = v_to,
    reviewed_by = case when p_action in ('reject', 'publish') then v_uid else q.reviewed_by end,
    published_at = case when p_action = 'publish' then now() else q.published_at end
  where q.id = p_question_id;

  perform private.assert_question_integrity(p_question_id);
  perform private.record_question_revision(p_question_id, 'status', v_q.status, v_to, v_reason);

  perform private.write_audit(
    v_q.owner_org_id, 'question.' || p_action, 'question', p_question_id::text,
    jsonb_strip_nulls(jsonb_build_object('from', v_q.status, 'to', v_to, 'reason', v_reason))
  );

  if p_action in ('reject', 'publish') and v_q.created_by is not null and v_q.created_by <> v_uid then
    perform private.notify_template(
      v_q.created_by, v_q.owner_org_id, 'system',
      case p_action when 'reject' then 'question_rejected' else 'question_published' end,
      jsonb_strip_nulls(jsonb_build_object('reason', v_reason)),
      case p_action when 'reject' then 'A question you wrote needs changes' else 'A question you wrote was published' end,
      v_reason,
      null
    );
  end if;

  return v_to;
end;
$$;

-- ---------------------------------------------------------------------------
-- Assets
-- ---------------------------------------------------------------------------

create function public.add_question_asset(p_question_id uuid, p_storage_path text, p_alt_bn text, p_alt_en text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  v_q record;
  v_object record;
  v_id uuid;
begin
  select q.id, q.owner_org_id into v_q from public.questions q where q.id = p_question_id for update;
  if not found or not private.can_read_question_internals(v_q.owner_org_id) then
    raise exception 'question_not_found' using errcode = 'P0001';
  end if;
  if not private.can_edit_question(p_question_id) then
    raise exception 'question_not_editable' using errcode = 'P0001';
  end if;
  if private.question_id_from_asset_path(p_storage_path) is distinct from p_question_id
    or split_part(p_storage_path, '/', 1) <> v_q.owner_org_id::text then
    raise exception 'invalid_asset_path' using errcode = 'P0001';
  end if;

  -- The object must already be uploaded (through a signed URL) to the private bucket.
  select o.metadata into v_object from storage.objects o
  where o.bucket_id = 'question-assets' and o.name = p_storage_path;
  if not found then
    raise exception 'asset_not_uploaded' using errcode = 'P0001';
  end if;

  begin
    insert into public.question_assets (question_id, owner_org_id, storage_path, mime_type, size_bytes, alt_bn, alt_en, sort_order, uploaded_by)
    values (
      p_question_id, v_q.owner_org_id, p_storage_path,
      v_object.metadata ->> 'mimetype',
      (v_object.metadata ->> 'size')::integer,
      left(coalesce(p_alt_bn, ''), 300), left(coalesce(p_alt_en, ''), 300),
      least(20, 1 + (select count(*) from public.question_assets a where a.question_id = p_question_id)),
      v_uid
    )
    returning id into v_id;
  exception when check_violation or not_null_violation or invalid_text_representation then
    raise exception 'invalid_asset' using errcode = 'P0001';
  when unique_violation then
    raise exception 'already_exists' using errcode = 'P0001';
  end;

  perform private.record_question_revision(p_question_id, 'content', null, 'draft', null);
  perform private.write_audit(v_q.owner_org_id, 'question.asset_added', 'question', p_question_id::text,
    jsonb_build_object('asset_id', v_id));
  return v_id;
end;
$$;

create function public.remove_question_asset(p_asset_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_asset record;
begin
  perform private.require_user();
  select a.id, a.question_id, a.owner_org_id into v_asset from public.question_assets a where a.id = p_asset_id;
  if not found or not private.can_read_question_internals(v_asset.owner_org_id) then
    raise exception 'question_not_found' using errcode = 'P0001';
  end if;
  if not private.can_edit_question(v_asset.question_id) then
    raise exception 'question_not_editable' using errcode = 'P0001';
  end if;
  delete from public.question_assets a where a.id = p_asset_id;
  perform private.record_question_revision(v_asset.question_id, 'content', null, 'draft', null);
  perform private.write_audit(v_asset.owner_org_id, 'question.asset_removed', 'question', v_asset.question_id::text,
    jsonb_build_object('asset_id', p_asset_id));
end;
$$;

-- ---------------------------------------------------------------------------
-- Duplicate lookup (for import dry runs and the editor)
-- ---------------------------------------------------------------------------

create function public.find_duplicate_questions(p_owner_org_id uuid, p_stem_bn text, p_stem_en text, p_exclude uuid default null)
returns table (question_id uuid, status public.question_status, matched_language text)
language sql
stable
security definer
set search_path = ''
as $$
  select q.id, q.status,
         case when q.stem_hash_bn = private.stem_hash(p_stem_bn) then 'bn' else 'en' end
  from public.questions q
  where private.can_read_question_internals(p_owner_org_id)
    and (p_exclude is null or q.id <> p_exclude)
    and (q.owner_org_id = p_owner_org_id or (q.status = 'published' and private.is_system_organization(q.owner_org_id)))
    and (
      (private.stem_hash(p_stem_bn) is not null and q.stem_hash_bn = private.stem_hash(p_stem_bn))
      or (private.stem_hash(p_stem_en) is not null and q.stem_hash_en = private.stem_hash(p_stem_en))
    )
  order by q.created_at
  limit 20;
$$;

-- ---------------------------------------------------------------------------
-- Catalog: topics join the reorderable entities
-- ---------------------------------------------------------------------------

create or replace function public.move_catalog_item(p_entity text, p_id text, p_direction text)
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
    when 'topic' then v_table := 'topics'; v_key_column := 'id';
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

revoke all on function public.save_question(uuid, uuid, jsonb) from public, anon, authenticated;
revoke all on function public.transition_question(uuid, text, text) from public, anon, authenticated;
revoke all on function public.add_question_asset(uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.remove_question_asset(uuid) from public, anon, authenticated;
revoke all on function public.find_duplicate_questions(uuid, text, text, uuid) from public, anon, authenticated;

grant execute on function public.save_question(uuid, uuid, jsonb) to authenticated;
grant execute on function public.transition_question(uuid, text, text) to authenticated;
grant execute on function public.add_question_asset(uuid, text, text, text) to authenticated;
grant execute on function public.remove_question_asset(uuid) to authenticated;
grant execute on function public.find_duplicate_questions(uuid, text, text, uuid) to authenticated;

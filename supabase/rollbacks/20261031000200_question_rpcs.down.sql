-- Rollback for 20261031000200_question_rpcs.sql.
-- Restores the Phase 1.5 move_catalog_item (without topics) and drops the
-- question RPCs. Content data is untouched.
begin;

drop function if exists public.find_duplicate_questions(uuid, text, text, uuid);
drop function if exists public.remove_question_asset(uuid);
drop function if exists public.add_question_asset(uuid, text, text, text);
drop function if exists public.transition_question(uuid, text, text);
drop function if exists public.save_question(uuid, uuid, jsonb);
drop function if exists private.question_duplicates(uuid, uuid, text, text);
drop function if exists private.refresh_question_completeness(uuid);
drop function if exists private.record_question_revision(uuid, text, public.question_status, public.question_status, text);
drop function if exists private.question_snapshot(uuid);
drop function if exists private.question_language_complete(uuid, text);

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

commit;

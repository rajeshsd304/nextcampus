-- NextCampus: platform administrator roles (primary + up to three additional).
--
-- Model
--   * public.platform_admins keeps one row per platform admin (unchanged:
--     private.is_super_admin() still means "has a row" and grants platform access).
--   * Each row occupies a SLOT 1–4 with a UNIQUE constraint, so more than four
--     administrators is structurally impossible — whatever the isolation level
--     or concurrency. Slot 1 is reserved for the single PRIMARY admin.
--   * Only the primary admin may grant/revoke additional admins, through the
--     audited RPCs below. API roles still have no write privileges on the table.
--   * The primary admin cannot be removed or demoted through those RPCs or any
--     other path: a trigger blocks it unless the SQL-only bootstrap/transfer
--     functions (not executable by API roles) are running.
--   * Bootstrap: an operator runs, with database-owner access (SQL editor/psql),
--       select private.bootstrap_primary_admin('<email>');
--     It only accepts an existing account whose email is CONFIRMED in Supabase
--     Auth, and only when no primary exists. No email is hard-coded here.
--
-- Rollback: supabase/rollbacks/20261101000100_platform_admin_roles.down.sql

alter table public.platform_admins
  add column is_primary boolean not null default false,
  add column slot smallint;

-- Existing admins (e.g. local seed accounts) become additional admins in slots 2–4.
do $$
declare
  v_count integer;
begin
  select count(*) into v_count from public.platform_admins;
  if v_count > 3 then
    raise exception 'platform_admin_limit_reached: % existing platform admins; at most 3 can be kept as additional admins (slot 1 is reserved for the primary). Remove extras before applying this migration.', v_count;
  end if;
  update public.platform_admins pa
  set slot = numbered.n + 1
  from (select user_id, row_number() over (order by created_at, user_id) as n from public.platform_admins) numbered
  where numbered.user_id = pa.user_id;
end;
$$;

alter table public.platform_admins
  alter column slot set not null,
  add constraint platform_admins_slot_range check (slot between 1 and 4),
  add constraint platform_admins_slot_unique unique (slot),
  add constraint platform_admins_primary_slot check (is_primary = (slot = 1));

comment on column public.platform_admins.slot is
  'Seat 1–4 (unique). Slot 1 = primary admin. Caps platform admins at four.';

create function private.platform_admin_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_privileged boolean := coalesce(current_setting('nextcampus.primary_admin_change', true), '') = 'on';
  v_free smallint;
begin
  if tg_op = 'INSERT' then
    if new.is_primary and not v_privileged then
      raise exception 'primary_admin_protected' using errcode = '42501';
    end if;
    if new.slot is null then
      -- Serialize slot selection; the UNIQUE(slot) constraint is the real guarantee.
      perform pg_advisory_xact_lock(hashtext('public.platform_admins.slot'));
      select s into v_free
      from generate_series(case when new.is_primary then 1 else 2 end, case when new.is_primary then 1 else 4 end) s
      where not exists (select 1 from public.platform_admins pa where pa.slot = s)
      order by s
      limit 1;
      if v_free is null then
        raise exception 'platform_admin_limit_reached' using errcode = 'P0001';
      end if;
      new.slot := v_free;
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if (old.is_primary or new.is_primary or old.slot = 1 or new.slot = 1) and not v_privileged then
      raise exception 'primary_admin_protected' using errcode = '42501';
    end if;
    return new;
  end if;

  -- DELETE
  if old.is_primary and not v_privileged then
    raise exception 'primary_admin_protected' using errcode = '42501';
  end if;
  return old;
end;
$$;

create trigger platform_admins_guard
before insert or update or delete on public.platform_admins
for each row execute function private.platform_admin_guard();

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create function private.is_primary_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.platform_admins pa where pa.user_id = (select auth.uid()) and pa.is_primary
  );
$$;

-- ---------------------------------------------------------------------------
-- Primary-admin RPCs (authenticated callers; authorization inside)
-- ---------------------------------------------------------------------------

-- Grants platform admin to an EXISTING account with a CONFIRMED email.
create function public.grant_platform_admin(p_email text)
returns table (user_id uuid, slot smallint)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_target uuid;
  v_slot smallint;
begin
  if not private.is_primary_admin() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or char_length(v_email) > 320 then
    raise exception 'invalid_email' using errcode = 'P0001';
  end if;

  select u.id into v_target
  from auth.users u
  where lower(u.email) = v_email and u.email_confirmed_at is not null and u.deleted_at is null;
  if v_target is null then
    -- Same error whether the account is missing or unverified.
    raise exception 'admin_candidate_not_found' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.platform_admins pa where pa.user_id = v_target) then
    raise exception 'already_platform_admin' using errcode = 'P0001';
  end if;

  begin
    insert into public.platform_admins (user_id, granted_by) values (v_target, v_uid)
    returning platform_admins.slot into v_slot;
  exception when unique_violation then
    -- Lost a race for the last free seat.
    raise exception 'platform_admin_limit_reached' using errcode = 'P0001';
  end;

  perform private.write_audit(null, 'platform_admin.granted', 'user', v_target::text, jsonb_build_object('slot', v_slot));
  perform private.notify_template(
    v_target, null, 'security', 'platform_admin_granted', '{}'::jsonb,
    'You are now a NextCampus platform admin', 'You can open the platform console from your account menu.', '/platform'
  );
  return query select v_target, v_slot;
end;
$$;

create function public.revoke_platform_admin(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row record;
begin
  perform private.require_user();
  if not private.is_primary_admin() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  select pa.user_id, pa.is_primary, pa.slot into v_row
  from public.platform_admins pa where pa.user_id = p_user_id
  for update;
  if not found then
    raise exception 'platform_admin_not_found' using errcode = 'P0001';
  end if;
  if v_row.is_primary then
    raise exception 'primary_admin_protected' using errcode = '42501';
  end if;

  delete from public.platform_admins pa where pa.user_id = p_user_id;
  perform private.write_audit(null, 'platform_admin.revoked', 'user', p_user_id::text, jsonb_build_object('slot', v_row.slot));
  perform private.notify_template(
    p_user_id, null, 'security', 'platform_admin_revoked', '{}'::jsonb,
    'Your platform admin access was removed', 'Contact the primary admin if you think this is a mistake.', null
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Operator-only bootstrap and transfer (NOT executable by API roles)
-- ---------------------------------------------------------------------------

create function private.bootstrap_primary_admin(p_email text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_target uuid;
  v_existing uuid;
begin
  select u.id into v_target
  from auth.users u
  where lower(u.email) = v_email and u.email_confirmed_at is not null and u.deleted_at is null;
  if v_target is null then
    raise exception 'primary_admin_bootstrap_failed: no account with a CONFIRMED email %; sign up and verify the email first', v_email;
  end if;

  select pa.user_id into v_existing from public.platform_admins pa where pa.is_primary;
  if v_existing = v_target then
    return v_target; -- idempotent
  end if;
  if v_existing is not null then
    raise exception 'primary_admin_bootstrap_failed: a primary admin already exists; use private.transfer_primary_admin()';
  end if;

  perform set_config('nextcampus.primary_admin_change', 'on', true);
  perform pg_advisory_xact_lock(hashtext('public.platform_admins.slot'));
  -- An existing additional admin is promoted (frees its slot first).
  delete from public.platform_admins pa where pa.user_id = v_target;
  insert into public.platform_admins (user_id, is_primary, slot) values (v_target, true, 1);
  perform set_config('nextcampus.primary_admin_change', 'off', true);

  insert into public.audit_logs (organization_id, actor_id, action, target_type, target_id, metadata)
  values (null, null, 'platform_admin.primary_bootstrapped', 'user', v_target::text, '{}'::jsonb);
  return v_target;
end;
$$;

-- Hands the primary role to another CONFIRMED account; the old primary becomes
-- an additional admin if a seat is free, otherwise loses admin access.
create function private.transfer_primary_admin(p_email text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_target uuid;
  v_old uuid;
begin
  select u.id into v_target
  from auth.users u
  where lower(u.email) = v_email and u.email_confirmed_at is not null and u.deleted_at is null;
  if v_target is null then
    raise exception 'primary_admin_transfer_failed: no account with a CONFIRMED email %', v_email;
  end if;

  perform set_config('nextcampus.primary_admin_change', 'on', true);
  perform pg_advisory_xact_lock(hashtext('public.platform_admins.slot'));
  select pa.user_id into v_old from public.platform_admins pa where pa.is_primary;
  delete from public.platform_admins pa where pa.user_id in (v_target, v_old);
  insert into public.platform_admins (user_id, is_primary, slot) values (v_target, true, 1);
  if v_old is not null and v_old <> v_target then
    begin
      insert into public.platform_admins (user_id) values (v_old);
    exception when others then
      null; -- no free seat: the previous primary simply loses admin access
    end;
  end if;
  perform set_config('nextcampus.primary_admin_change', 'off', true);

  insert into public.audit_logs (organization_id, actor_id, action, target_type, target_id, metadata)
  values (null, null, 'platform_admin.primary_transferred', 'user', v_target::text,
          jsonb_strip_nulls(jsonb_build_object('previous', v_old)));
  return v_target;
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
-- bootstrap_primary_admin / transfer_primary_admin are deliberately NOT granted.

revoke all on function public.grant_platform_admin(text) from public, anon, authenticated;
revoke all on function public.revoke_platform_admin(uuid) from public, anon, authenticated;
grant execute on function public.grant_platform_admin(text) to authenticated;
grant execute on function public.revoke_platform_admin(uuid) to authenticated;

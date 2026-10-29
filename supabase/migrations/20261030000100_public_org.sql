-- NextCampus Phase 1.5: the system-level public organization (B2C practice).
--
-- * organizations.is_system marks platform-owned tenants. The public org
--   ("NextCampus Public", slug `public`) is created here because it must exist
--   in every environment.
-- * System organizations cannot be renamed, re-slugged, suspended, deleted or
--   left — enforced by triggers and RPC checks, not just the UI.
-- * Self-signup users without a pending invitation are enrolled as `student`
--   by the existing profile-provisioning trigger (idempotent, audited).
-- * RLS is tightened: in a system org, `members.read` alone no longer grants
--   roster or profile visibility (students already lacked it); only members
--   with `members.manage` there can see other members.
--
-- Rollback: supabase/rollbacks/20261030000100_public_org.down.sql

alter table public.organizations add column is_system boolean not null default false;

insert into public.organizations (id, name, slug, type, is_system)
values ('00000000-0000-4000-8000-00000000c0de', 'NextCampus Public', 'public', 'other', true)
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- System organization protection
-- ---------------------------------------------------------------------------

create function private.protect_system_organization()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    if old.is_system then
      raise exception 'system_organization_protected' using errcode = '42501';
    end if;
    return old;
  end if;

  if old.is_system and (
    new.name is distinct from old.name
    or new.slug is distinct from old.slug
    or new.status is distinct from old.status
    or new.is_system is distinct from old.is_system
  ) then
    raise exception 'system_organization_protected' using errcode = '42501';
  end if;

  if not old.is_system and new.is_system then
    raise exception 'system_organization_protected' using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger organizations_protect_system
before update or delete on public.organizations
for each row execute function private.protect_system_organization();

create function private.is_system_organization(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select o.is_system from public.organizations o where o.id = p_organization_id), false);
$$;

create function private.public_organization_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select o.id from public.organizations o where o.is_system and o.slug = 'public';
$$;

-- ---------------------------------------------------------------------------
-- RLS tightening: roster visibility
-- ---------------------------------------------------------------------------

-- Roster visibility: members.read, except in system organizations where only
-- members.manage (platform-appointed admins) may see other members.
create function private.can_read_roster(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.has_org_permission(p_organization_id, 'members.read')
    and (
      not private.is_system_organization(p_organization_id)
      or private.has_org_permission(p_organization_id, 'members.manage')
    );
$$;

create or replace function private.can_view_profile(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members target
    where target.user_id = p_profile_id
      and private.can_read_roster(target.organization_id)
  );
$$;

drop policy organization_members_select on public.organization_members;
create policy organization_members_select on public.organization_members
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or private.can_read_roster(organization_id)
    or (select private.is_super_admin())
  );

-- ---------------------------------------------------------------------------
-- Enrollment
-- ---------------------------------------------------------------------------

-- Idempotent: returns true only when a membership was created.
create function private.enroll_in_public_organization(p_user_id uuid, p_action text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid := private.public_organization_id();
  v_inserted integer;
begin
  if v_org is null or p_user_id is null then
    return false;
  end if;

  insert into public.organization_members (organization_id, user_id, role)
  values (v_org, p_user_id, 'student')
  on conflict (organization_id, user_id) do nothing;
  get diagnostics v_inserted = row_count;

  if v_inserted = 0 then
    return false;
  end if;

  -- Actor is the enrolled user (auth.uid() is null inside the auth.users trigger).
  insert into public.audit_logs (organization_id, actor_id, action, target_type, target_id, metadata)
  values (v_org, p_user_id, p_action, 'user', p_user_id::text, jsonb_build_object('role', 'student'));
  return true;
end;
$$;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
  v_avatar text;
  v_email text := lower(coalesce(new.email, ''));
begin
  v_name := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', '')), '');
  if v_name is not null then
    v_name := left(v_name, 120);
  end if;

  v_avatar := coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture');
  if v_avatar is not null and (v_avatar !~ '^https://' or char_length(v_avatar) > 2048) then
    v_avatar := null;
  end if;

  insert into public.profiles (id, email, full_name, avatar_url)
  values (new.id, v_email, v_name, v_avatar);

  insert into public.audit_logs (organization_id, actor_id, action, target_type, target_id, metadata)
  values (
    null,
    new.id,
    'auth.sign_up',
    'user',
    new.id::text,
    jsonb_build_object('provider', coalesce(new.raw_app_meta_data ->> 'provider', 'email'))
  );

  -- Self-signups join the public practice organization. People who arrive with a
  -- pending invitation are left to their inviting organization.
  if v_email <> '' and not exists (
    select 1 from public.invitations i
    where i.email = v_email and i.status = 'pending' and i.expires_at > now()
  ) then
    perform private.enroll_in_public_organization(new.id, 'member.auto_enrolled');
  end if;

  return new;
end;
$$;

-- Explicit opt-in for users who joined through an invitation (or left nothing
-- else) and now want public practice too.
create function public.join_public_organization()
returns table (organization_slug text, joined boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  v_joined boolean;
begin
  v_joined := private.enroll_in_public_organization(v_uid, 'member.joined_public');
  return query select o.slug, v_joined from public.organizations o where o.id = private.public_organization_id();
end;
$$;

-- ---------------------------------------------------------------------------
-- Existing RPCs: system-organization guards
-- ---------------------------------------------------------------------------

create or replace function public.set_organization_status(p_organization_id uuid, p_status public.organization_status)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_user();
  if not private.is_super_admin() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  if private.is_system_organization(p_organization_id) then
    raise exception 'system_organization_protected' using errcode = '42501';
  end if;

  update public.organizations o set status = p_status where o.id = p_organization_id;
  if not found then
    raise exception 'organization_not_found' using errcode = 'P0001';
  end if;
end;
$$;

create or replace function public.remove_member(p_organization_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  v_self boolean := p_user_id = v_uid;
  v_role public.org_role;
  v_org_name text;
begin
  if not v_self and not private.has_org_permission(p_organization_id, 'members.manage') then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  -- Leaving the public practice organization would strand the account.
  if v_self and private.is_system_organization(p_organization_id) then
    raise exception 'system_organization_protected' using errcode = '42501';
  end if;

  perform private.lock_org_admins(p_organization_id);

  select m.role into v_role
  from public.organization_members m
  where m.organization_id = p_organization_id and m.user_id = p_user_id
  for update;

  if v_role is null then
    raise exception 'member_not_found' using errcode = 'P0001';
  end if;

  if v_role = 'org_admin' and not private.other_active_admin_exists(p_organization_id, p_user_id) then
    raise exception 'last_admin' using errcode = 'P0001';
  end if;

  delete from public.organization_members m
  where m.organization_id = p_organization_id and m.user_id = p_user_id;

  perform private.write_audit(
    p_organization_id,
    case when v_self then 'member.left' else 'member.removed' end,
    'user', p_user_id::text,
    jsonb_build_object('role', v_role)
  );

  if not v_self then
    select o.name into v_org_name from public.organizations o where o.id = p_organization_id;
    perform private.notify(
      p_user_id, null, 'membership',
      'You were removed from ' || v_org_name,
      'Contact an administrator of the organization if you think this is a mistake.',
      null
    );
  end if;
end;
$$;

create or replace function public.create_organization(p_name text, p_slug text, p_type public.organization_type)
returns table (organization_id uuid, organization_slug text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  v_name text := btrim(coalesce(p_name, ''));
  v_slug text := lower(btrim(coalesce(p_slug, '')));
  v_org_id uuid;
  v_reserved text[] := array[
    'admin', 'api', 'app', 'auth', 'dashboard', 'exams', 'help', 'invite', 'invitations', 'login', 'nextcampus',
    'notifications', 'onboarding', 'platform', 'public', 'settings', 'sign-in', 'sign-up', 'support', 'www'
  ];
begin
  if not exists (select 1 from public.profiles p where p.id = v_uid and p.onboarded_at is not null) then
    raise exception 'profile_incomplete' using errcode = 'P0001';
  end if;

  if char_length(v_name) not between 2 and 120 then
    raise exception 'invalid_input' using errcode = 'P0001';
  end if;

  if v_slug !~ '^[a-z0-9](?:[a-z0-9-]{1,46}[a-z0-9])$' or v_slug ~ '--' then
    raise exception 'invalid_slug' using errcode = 'P0001';
  end if;

  if v_slug = any (v_reserved) then
    raise exception 'slug_reserved' using errcode = 'P0001';
  end if;

  if (select count(*) from public.organizations o where o.created_by = v_uid) >= 5 then
    raise exception 'organization_limit_reached' using errcode = 'P0001';
  end if;

  begin
    insert into public.organizations (name, slug, type, created_by)
    values (v_name, v_slug, p_type, v_uid)
    returning id into v_org_id;
  exception when unique_violation then
    raise exception 'slug_taken' using errcode = 'P0001';
  end;

  insert into public.organization_members (organization_id, user_id, role)
  values (v_org_id, v_uid, 'org_admin');

  perform private.write_audit(
    v_org_id, 'organization.created', 'organization', v_org_id::text,
    jsonb_build_object('name', v_name, 'slug', v_slug, 'type', p_type)
  );

  return query select v_org_id, v_slug;
end;
$$;

-- ---------------------------------------------------------------------------
-- Backfill: existing self-signup accounts with no organization at all.
-- Platform admins and people with pending invitations are left alone.
-- ---------------------------------------------------------------------------

select private.enroll_in_public_organization(p.id, 'member.auto_enrolled')
from public.profiles p
where p.email <> ''
  and not exists (select 1 from public.organization_members m where m.user_id = p.id)
  and not exists (select 1 from public.platform_admins pa where pa.user_id = p.id)
  and not exists (
    select 1 from public.invitations i
    where i.email = p.email and i.status = 'pending' and i.expires_at > now()
  );

-- ---------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------

revoke all on all functions in schema private from public;
grant execute on function private.is_super_admin() to authenticated;
grant execute on function private.is_org_member(uuid) to authenticated;
grant execute on function private.has_org_permission(uuid, text) to authenticated;
grant execute on function private.can_view_profile(uuid) to authenticated;
grant execute on function private.can_read_roster(uuid) to authenticated;

revoke all on function public.join_public_organization() from public, anon, authenticated;
grant execute on function public.join_public_organization() to authenticated;

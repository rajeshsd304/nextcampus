-- Rollback for 20261030000100_public_org.sql (restores the Phase 1 definitions).
-- Usage: psql "$DATABASE_URL" -f supabase/rollbacks/20261030000100_public_org.down.sql
-- then delete the migration's row from supabase_migrations.schema_migrations.
-- Public-org memberships are removed; audit history is kept (append-only).

begin;

drop function if exists public.join_public_organization();

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
  v_avatar text;
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
  values (new.id, lower(coalesce(new.email, '')), v_name, v_avatar);

  insert into public.audit_logs (organization_id, actor_id, action, target_type, target_id, metadata)
  values (
    null,
    new.id,
    'auth.sign_up',
    'user',
    new.id::text,
    jsonb_build_object('provider', coalesce(new.raw_app_meta_data ->> 'provider', 'email'))
  );

  return new;
end;
$$;

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

  update public.organizations o set status = p_status where o.id = p_organization_id;
  if not found then
    raise exception 'organization_not_found' using errcode = 'P0001';
  end if;
  -- organizations_audit_update records the change.
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
    'admin', 'api', 'app', 'auth', 'dashboard', 'help', 'invite', 'invitations', 'login', 'nextcampus',
    'notifications', 'onboarding', 'platform', 'settings', 'sign-in', 'sign-up', 'support', 'www'
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
      and private.has_org_permission(target.organization_id, 'members.read')
  );
$$;

drop policy organization_members_select on public.organization_members;
create policy organization_members_select on public.organization_members
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or private.has_org_permission(organization_id, 'members.read')
    or (select private.is_super_admin())
  );

drop function if exists private.can_read_roster(uuid);
drop function if exists private.enroll_in_public_organization(uuid, text);

drop trigger if exists organizations_protect_system on public.organizations;
drop function if exists private.protect_system_organization();

delete from public.organizations where is_system;

drop function if exists private.public_organization_id();
drop function if exists private.is_system_organization(uuid);

alter table public.organizations drop column is_system;

revoke all on all functions in schema private from public;
grant execute on function private.is_super_admin() to authenticated;
grant execute on function private.is_org_member(uuid) to authenticated;
grant execute on function private.has_org_permission(uuid, text) to authenticated;
grant execute on function private.can_view_profile(uuid) to authenticated;

commit;

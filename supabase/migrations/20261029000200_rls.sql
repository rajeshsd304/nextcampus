-- NextCampus Phase 1: authorization helpers and Row Level Security.
--
-- Helper functions live in the unexposed `private` schema and are
-- SECURITY DEFINER so policies on organization_members do not recurse.
-- All helpers derive identity from auth.uid(); none accept a user id from
-- the caller, so they cannot be used to probe other users' memberships.

create function private.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.platform_admins pa where pa.user_id = (select auth.uid())
  );
$$;

-- Active membership in an organization (regardless of organization status, so
-- members of a suspended organization can still see why access is limited).
create function private.is_org_member(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members m
    where m.organization_id = p_organization_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
  );
$$;

-- Permission check: active membership, in an active organization, whose role
-- grants the permission.
create function private.has_org_permission(p_organization_id uuid, p_permission text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members m
    join public.organizations o on o.id = m.organization_id
    join public.role_permissions rp on rp.role = m.role
    where m.organization_id = p_organization_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
      and o.status = 'active'
      and rp.permission_key = p_permission
  );
$$;

-- A profile is visible to people who manage/see the roster of an organization
-- the profile's owner belongs to.
create function private.can_view_profile(p_profile_id uuid)
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

create function private.current_user_email()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select lower(u.email)
  from auth.users u
  where u.id = (select auth.uid())
    and u.email_confirmed_at is not null;
$$;

revoke all on all functions in schema private from public;
grant execute on function private.is_super_admin() to authenticated;
grant execute on function private.is_org_member(uuid) to authenticated;
grant execute on function private.has_org_permission(uuid, text) to authenticated;
grant execute on function private.can_view_profile(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Enable RLS on every table. SECURITY DEFINER functions (owned by the table
-- owner) are the only path for writes, so RLS is intentionally not FORCEd.
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.platform_admins enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.invitations enable row level security;
alter table public.audit_logs enable row level security;
alter table public.notifications enable row level security;
alter table public.contact_requests enable row level security;

-- profiles ------------------------------------------------------------------

create policy profiles_select on public.profiles
  for select to authenticated
  using (
    id = (select auth.uid())
    or (select private.is_super_admin())
    or private.can_view_profile(id)
  );

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- platform_admins -------------------------------------------------------------

create policy platform_admins_select on public.platform_admins
  for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_super_admin()));

-- organizations ---------------------------------------------------------------

create policy organizations_select on public.organizations
  for select to authenticated
  using (private.is_org_member(id) or (select private.is_super_admin()));

create policy organizations_update on public.organizations
  for update to authenticated
  using (private.has_org_permission(id, 'org.update'))
  with check (private.has_org_permission(id, 'org.update'));

-- organization_members ------------------------------------------------------

create policy organization_members_select on public.organization_members
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or private.has_org_permission(organization_id, 'members.read')
    or (select private.is_super_admin())
  );

-- permissions / role_permissions (reference data) -----------------------------

create policy permissions_select on public.permissions
  for select to authenticated
  using (true);

create policy role_permissions_select on public.role_permissions
  for select to authenticated
  using (true);

-- invitations -----------------------------------------------------------------
-- Invitees see their own invitations through public.list_my_invitations().

create policy invitations_select on public.invitations
  for select to authenticated
  using (
    private.has_org_permission(organization_id, 'invitations.read')
    or (select private.is_super_admin())
  );

-- audit_logs ------------------------------------------------------------------

create policy audit_logs_select on public.audit_logs
  for select to authenticated
  using (
    (organization_id is not null and private.has_org_permission(organization_id, 'audit.read'))
    or (organization_id is null and actor_id = (select auth.uid()))
    or (select private.is_super_admin())
  );

-- notifications ---------------------------------------------------------------

create policy notifications_select_own on public.notifications
  for select to authenticated
  using (user_id = (select auth.uid()));

-- contact_requests ------------------------------------------------------------

create policy contact_requests_select on public.contact_requests
  for select to authenticated
  using ((select private.is_super_admin()));

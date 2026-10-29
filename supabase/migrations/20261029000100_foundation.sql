-- NextCampus Phase 1: identity and multi-tenancy foundation.
--
-- Conventions
--   * Every table in `public` has RLS enabled (see 20261029000200_rls.sql).
--   * Table privileges are granted explicitly and minimally; Supabase's default
--     "grant all to anon/authenticated" privileges are revoked below.
--   * Tenancy-changing writes go through SECURITY DEFINER functions that
--     validate, authorize and audit (see 20261029000300_rpc.sql).
--   * Timestamps for security-sensitive events always come from the database.

create schema if not exists private;
revoke all on schema private from public;
-- `authenticated` may *execute* the RLS helper functions in this schema (granted
-- per-function); the schema itself is never exposed through the Data API.
grant usage on schema private to authenticated;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.org_role as enum ('org_admin', 'instructor', 'invigilator', 'student');

create type public.organization_type as enum (
  'university',
  'coaching_center',
  'training_organization',
  'independent_instructor',
  'other'
);

create type public.organization_status as enum ('active', 'suspended');

create type public.membership_status as enum ('active', 'suspended');

create type public.invitation_status as enum ('pending', 'accepted', 'declined', 'revoked');

create type public.notification_kind as enum ('invitation', 'membership', 'security', 'system');

create type public.contact_topic as enum ('sales', 'support', 'partnership', 'security', 'other');

-- ---------------------------------------------------------------------------
-- Shared trigger: updated_at maintained by the database clock.
-- ---------------------------------------------------------------------------

create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles: one row per auth user, created by trigger on auth.users.
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null check (email = lower(email) and char_length(email) <= 320),
  full_name text check (full_name is null or char_length(btrim(full_name)) between 1 and 120),
  display_name text check (display_name is null or char_length(btrim(display_name)) between 1 and 60),
  avatar_url text check (avatar_url is null or (avatar_url ~ '^https://' and char_length(avatar_url) <= 2048)),
  timezone text not null default 'UTC' check (char_length(timezone) between 1 and 64),
  locale text not null default 'en' check (locale ~ '^[a-z]{2}(-[A-Z]{2})?$'),
  marketing_opt_in boolean not null default false,
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_email_idx on public.profiles (email);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- platform_admins: Super Administrators. Writable only by service role / SQL.
-- ---------------------------------------------------------------------------

create table public.platform_admins (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  granted_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- organizations (tenants)
-- ---------------------------------------------------------------------------

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9](?:[a-z0-9-]{1,46}[a-z0-9])$' and slug !~ '--'),
  type public.organization_type not null,
  status public.organization_status not null default 'active',
  website text check (website is null or (website ~ '^https?://' and char_length(website) <= 2048)),
  contact_email text check (
    contact_email is null or (contact_email = lower(contact_email) and contact_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')
  ),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index organizations_created_by_idx on public.organizations (created_by);

create trigger organizations_set_updated_at
before update on public.organizations
for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- organization_members: one role per user per organization.
-- ---------------------------------------------------------------------------

create table public.organization_members (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.org_role not null,
  status public.membership_status not null default 'active',
  invited_by uuid references public.profiles (id) on delete set null,
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create index organization_members_user_idx on public.organization_members (user_id);
create index organization_members_org_role_idx on public.organization_members (organization_id, role);

create trigger organization_members_set_updated_at
before update on public.organization_members
for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- permissions / role_permissions: the authorization matrix (reference data).
-- ---------------------------------------------------------------------------

create table public.permissions (
  key text primary key check (key ~ '^[a-z]+(\.[a-z_]+)+$'),
  description text not null check (char_length(description) between 1 and 300)
);

create table public.role_permissions (
  role public.org_role not null,
  permission_key text not null references public.permissions (key) on delete cascade,
  primary key (role, permission_key)
);

-- ---------------------------------------------------------------------------
-- invitations: email-bound, single-use, expiring. Only a SHA-256 hash of the
-- token is stored; the raw token is returned once to the inviter.
-- ---------------------------------------------------------------------------

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  email text not null check (email = lower(email) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 320),
  role public.org_role not null,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  status public.invitation_status not null default 'pending',
  invited_by uuid references public.profiles (id) on delete set null,
  expires_at timestamptz not null default (now() + interval '7 days'),
  responded_by uuid references public.profiles (id) on delete set null,
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  constraint invitations_response_consistency check (
    (status = 'pending' and responded_at is null) or (status <> 'pending' and responded_at is not null)
  )
);

create unique index invitations_one_pending_per_email_idx
  on public.invitations (organization_id, email)
  where status = 'pending';
create index invitations_org_created_idx on public.invitations (organization_id, created_at desc);
create index invitations_email_pending_idx on public.invitations (email) where status = 'pending';

-- ---------------------------------------------------------------------------
-- audit_logs: append-only. No foreign keys so history survives deletions.
-- ---------------------------------------------------------------------------

create table public.audit_logs (
  id bigint generated always as identity primary key,
  organization_id uuid,
  actor_id uuid,
  action text not null check (action ~ '^[a-z_]+(\.[a-z_]+)+$'),
  target_type text check (target_type is null or char_length(target_type) <= 64),
  target_id text check (target_id is null or char_length(target_id) <= 128),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);

create index audit_logs_org_created_idx on public.audit_logs (organization_id, created_at desc);
create index audit_logs_actor_created_idx on public.audit_logs (actor_id, created_at desc);

create function private.audit_logs_immutable()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'audit_logs_are_append_only' using errcode = '42501';
end;
$$;

create trigger audit_logs_no_update
before update or delete on public.audit_logs
for each row execute function private.audit_logs_immutable();

-- ---------------------------------------------------------------------------
-- notifications: per-user inbox.
-- ---------------------------------------------------------------------------

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  organization_id uuid references public.organizations (id) on delete cascade,
  kind public.notification_kind not null,
  title text not null check (char_length(title) between 1 and 160),
  body text check (body is null or char_length(body) <= 1000),
  action_url text check (action_url is null or (action_url ~ '^/[^/\\]' and char_length(action_url) <= 512)),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_created_idx on public.notifications (user_id, created_at desc);
create index notifications_user_unread_idx on public.notifications (user_id) where read_at is null;

-- ---------------------------------------------------------------------------
-- contact_requests: public contact form submissions.
-- ---------------------------------------------------------------------------

create table public.contact_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 120),
  email text not null check (email = lower(email) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 320),
  organization text check (organization is null or char_length(organization) <= 160),
  topic public.contact_topic not null,
  message text not null check (char_length(btrim(message)) between 10 and 4000),
  submitted_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index contact_requests_email_created_idx on public.contact_requests (email, created_at desc);

-- ---------------------------------------------------------------------------
-- Privileges: deny by default, then grant the minimum.
-- ---------------------------------------------------------------------------

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

grant select on public.profiles to authenticated;
-- Only these columns are user-editable. email/onboarded_at are system-managed.
grant update (full_name, display_name, avatar_url, timezone, locale, marketing_opt_in) on public.profiles to authenticated;

grant select on public.platform_admins to authenticated;

grant select on public.organizations to authenticated;
grant update (name, type, website, contact_email) on public.organizations to authenticated;

grant select on public.organization_members to authenticated;

grant select on public.permissions to authenticated;
grant select on public.role_permissions to authenticated;

-- token_hash is never readable by API roles.
grant select (id, organization_id, email, role, status, invited_by, expires_at, responded_by, responded_at, created_at)
  on public.invitations to authenticated;

grant select on public.audit_logs to authenticated;

grant select on public.notifications to authenticated;

grant select on public.contact_requests to authenticated;

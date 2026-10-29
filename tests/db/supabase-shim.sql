-- Minimal emulation of the Supabase platform objects that NextCampus
-- migrations depend on, so the real migrations, RLS policies and RPCs can be
-- exercised in-process with PGlite. Mirrors Supabase semantics for:
--   * roles anon / authenticated / service_role (service_role bypasses RLS)
--   * auth.uid(), auth.jwt(), auth.role() reading request.jwt.claims
--   * auth.users / auth.identities columns used by migrations and seed
--   * Supabase's default privileges on the public schema (which the
--     migrations must explicitly revoke)

create role anon nologin noinherit;
create role authenticated nologin noinherit;
create role service_role nologin noinherit bypassrls;

create schema extensions;
create extension pgcrypto with schema extensions;

create schema auth;

create table auth.users (
  instance_id uuid,
  id uuid primary key,
  aud varchar(255),
  role varchar(255),
  email varchar(255),
  encrypted_password varchar(255),
  email_confirmed_at timestamptz,
  raw_app_meta_data jsonb,
  raw_user_meta_data jsonb,
  created_at timestamptz,
  updated_at timestamptz,
  last_sign_in_at timestamptz,
  confirmation_token varchar(255),
  recovery_token varchar(255),
  email_change_token_new varchar(255),
  email_change varchar(255)
);

create table auth.identities (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  provider_id text not null,
  identity_data jsonb not null,
  provider text not null,
  last_sign_in_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  unique (provider_id, provider)
);

create function auth.jwt() returns jsonb
language sql stable
as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb);
$$;

create function auth.uid() returns uuid
language sql stable
as $$
  select nullif(auth.jwt() ->> 'sub', '')::uuid;
$$;

create function auth.role() returns text
language sql stable
as $$
  select auth.jwt() ->> 'role';
$$;

grant usage on schema auth to anon, authenticated, service_role;
grant execute on all functions in schema auth to anon, authenticated, service_role;
grant usage on schema extensions to anon, authenticated, service_role;

grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;

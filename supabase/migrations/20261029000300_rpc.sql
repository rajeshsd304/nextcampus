-- NextCampus Phase 1: triggers and RPCs for identity and tenancy management.
--
-- Every function below:
--   * is SECURITY DEFINER with an empty search_path (fully-qualified names only);
--   * derives the actor from auth.uid() — never from an argument;
--   * validates input and authorizes before writing;
--   * writes an audit log entry for tenancy-relevant changes;
--   * raises stable, machine-readable error messages that the application maps
--     to user-facing copy (see src/lib/errors.ts).

-- ---------------------------------------------------------------------------
-- Internal helpers (not executable by API roles)
-- ---------------------------------------------------------------------------

create function private.require_user()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  return v_uid;
end;
$$;

create function private.write_audit(
  p_organization_id uuid,
  p_action text,
  p_target_type text,
  p_target_id text,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.audit_logs (organization_id, actor_id, action, target_type, target_id, metadata)
  values (p_organization_id, auth.uid(), p_action, p_target_type, p_target_id, coalesce(p_metadata, '{}'::jsonb));
$$;

create function private.notify(
  p_user_id uuid,
  p_organization_id uuid,
  p_kind public.notification_kind,
  p_title text,
  p_body text,
  p_action_url text
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.notifications (user_id, organization_id, kind, title, body, action_url)
  values (p_user_id, p_organization_id, p_kind, left(p_title, 160), left(p_body, 1000), p_action_url);
$$;

create function private.profile_label(p_user_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(p.display_name, p.full_name, p.email, 'A NextCampus user')
  from public.profiles p
  where p.id = p_user_id;
$$;

create function private.lock_org_admins(p_organization_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Serialises concurrent role changes/removals so the "last admin" check holds.
  perform 1
  from public.organization_members m
  where m.organization_id = p_organization_id and m.role = 'org_admin'
  for update;
end;
$$;

create function private.other_active_admin_exists(p_organization_id uuid, p_excluding_user uuid)
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
      and m.role = 'org_admin'
      and m.status = 'active'
      and m.user_id <> p_excluding_user
  );
$$;

-- ---------------------------------------------------------------------------
-- auth.users triggers: provision and sync profiles.
-- ---------------------------------------------------------------------------

create function private.handle_new_user()
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

create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

create function private.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set email = lower(coalesce(new.email, '')) where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
after update of email on auth.users
for each row
when (old.email is distinct from new.email)
execute function private.handle_user_email_change();

-- ---------------------------------------------------------------------------
-- organizations: audit direct (RLS-permitted) updates.
-- ---------------------------------------------------------------------------

create function private.audit_organization_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_changes jsonb := '{}'::jsonb;
begin
  if new.name is distinct from old.name then
    v_changes := v_changes || jsonb_build_object('name', jsonb_build_object('from', old.name, 'to', new.name));
  end if;
  if new.type is distinct from old.type then
    v_changes := v_changes || jsonb_build_object('type', jsonb_build_object('from', old.type, 'to', new.type));
  end if;
  if new.website is distinct from old.website then
    v_changes := v_changes || jsonb_build_object('website', jsonb_build_object('from', old.website, 'to', new.website));
  end if;
  if new.contact_email is distinct from old.contact_email then
    v_changes := v_changes || jsonb_build_object('contact_email', jsonb_build_object('from', old.contact_email, 'to', new.contact_email));
  end if;
  if new.status is distinct from old.status then
    v_changes := v_changes || jsonb_build_object('status', jsonb_build_object('from', old.status, 'to', new.status));
  end if;

  if v_changes <> '{}'::jsonb then
    perform private.write_audit(new.id, 'organization.updated', 'organization', new.id::text, jsonb_build_object('changes', v_changes));
  end if;
  return new;
end;
$$;

create trigger organizations_audit_update
after update on public.organizations
for each row execute function private.audit_organization_update();

-- ---------------------------------------------------------------------------
-- Profile completion
-- ---------------------------------------------------------------------------

create function public.complete_onboarding(p_full_name text, p_display_name text, p_timezone text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  v_full_name text := btrim(coalesce(p_full_name, ''));
  v_display_name text := nullif(btrim(coalesce(p_display_name, '')), '');
  v_was_onboarded boolean;
begin
  if char_length(v_full_name) not between 1 and 120
    or (v_display_name is not null and char_length(v_display_name) > 60) then
    raise exception 'invalid_input' using errcode = 'P0001';
  end if;

  if not exists (select 1 from pg_catalog.pg_timezone_names tz where tz.name = p_timezone) then
    raise exception 'invalid_timezone' using errcode = 'P0001';
  end if;

  select p.onboarded_at is not null into v_was_onboarded from public.profiles p where p.id = v_uid for update;

  update public.profiles p
  set full_name = v_full_name,
      display_name = v_display_name,
      timezone = p_timezone,
      onboarded_at = coalesce(p.onboarded_at, now())
  where p.id = v_uid;

  if not coalesce(v_was_onboarded, false) then
    perform private.write_audit(null, 'profile.onboarded', 'user', v_uid::text, '{}'::jsonb);
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Organization onboarding
-- ---------------------------------------------------------------------------

create function public.create_organization(p_name text, p_slug text, p_type public.organization_type)
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

-- Super Administrator only: suspend / reactivate a tenant.
create function public.set_organization_status(p_organization_id uuid, p_status public.organization_status)
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

-- ---------------------------------------------------------------------------
-- Invitations
-- ---------------------------------------------------------------------------

create function public.create_invitation(p_organization_id uuid, p_email text, p_role public.org_role)
returns table (invitation_id uuid, invitation_token text, invitation_expires_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_token text;
  v_id uuid;
  v_expires timestamptz;
  v_org_name text;
  v_invitee uuid;
begin
  if not private.has_org_permission(p_organization_id, 'invitations.manage') then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or char_length(v_email) > 320 then
    raise exception 'invalid_email' using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from public.organization_members m
    join public.profiles p on p.id = m.user_id
    where m.organization_id = p_organization_id and p.email = v_email
  ) then
    raise exception 'already_member' using errcode = 'P0001';
  end if;

  if (
    select count(*) from public.invitations i
    where i.invited_by = v_uid and i.created_at > now() - interval '1 hour'
  ) >= 100 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;

  -- A new invitation supersedes any pending one for the same address.
  update public.invitations i
  set status = 'revoked', responded_at = now()
  where i.organization_id = p_organization_id and i.email = v_email and i.status = 'pending';

  v_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');

  insert into public.invitations (organization_id, email, role, token_hash, invited_by)
  values (
    p_organization_id, v_email, p_role,
    encode(sha256(convert_to(v_token, 'UTF8')), 'hex'),
    v_uid
  )
  returning id, expires_at into v_id, v_expires;

  perform private.write_audit(
    p_organization_id, 'invitation.created', 'invitation', v_id::text,
    jsonb_build_object('email', v_email, 'role', p_role)
  );

  select o.name into v_org_name from public.organizations o where o.id = p_organization_id;
  select p.id into v_invitee from public.profiles p where p.email = v_email;
  if v_invitee is not null then
    perform private.notify(
      v_invitee, null, 'invitation',
      'You have been invited to join ' || v_org_name,
      'Review the invitation to join as ' || replace(p_role::text, '_', ' ') || '.',
      '/invitations'
    );
  end if;

  return query select v_id, v_token, v_expires;
end;
$$;

create function public.revoke_invitation(p_invitation_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  v_inv record;
begin
  select i.id, i.organization_id, i.status, i.email
  into v_inv
  from public.invitations i
  where i.id = p_invitation_id
  for update;

  -- Do not reveal the existence of invitations in other tenants.
  if not found or not private.has_org_permission(v_inv.organization_id, 'invitations.manage') then
    raise exception 'invitation_not_found' using errcode = 'P0001';
  end if;

  if v_inv.status <> 'pending' then
    raise exception 'invitation_not_pending' using errcode = 'P0001';
  end if;

  update public.invitations i
  set status = 'revoked', responded_by = v_uid, responded_at = now()
  where i.id = p_invitation_id;

  perform private.write_audit(
    v_inv.organization_id, 'invitation.revoked', 'invitation', p_invitation_id::text,
    jsonb_build_object('email', v_inv.email)
  );
end;
$$;

create function private.accept_invitation(p_invitation_id uuid)
returns table (organization_id uuid, organization_slug text, member_role public.org_role)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  v_email text := private.current_user_email();
  v_inv record;
  v_org record;
begin
  if v_email is null then
    raise exception 'email_not_verified' using errcode = 'P0001';
  end if;

  select i.id, i.organization_id, i.email, i.role, i.status, i.expires_at, i.invited_by
  into v_inv
  from public.invitations i
  where i.id = p_invitation_id
  for update;

  if not found then
    raise exception 'invitation_not_found' using errcode = 'P0001';
  end if;

  if v_inv.email <> v_email then
    raise exception 'invitation_email_mismatch' using errcode = '42501';
  end if;

  if v_inv.status <> 'pending' then
    raise exception 'invitation_not_pending' using errcode = 'P0001';
  end if;

  if v_inv.expires_at <= now() then
    raise exception 'invitation_expired' using errcode = 'P0001';
  end if;

  select o.id, o.slug, o.name, o.status into v_org from public.organizations o where o.id = v_inv.organization_id;
  if v_org.status <> 'active' then
    raise exception 'organization_inactive' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from public.organization_members m
    where m.organization_id = v_inv.organization_id and m.user_id = v_uid
  ) then
    raise exception 'already_member' using errcode = 'P0001';
  end if;

  insert into public.organization_members (organization_id, user_id, role, invited_by)
  values (v_inv.organization_id, v_uid, v_inv.role, v_inv.invited_by);

  update public.invitations i
  set status = 'accepted', responded_by = v_uid, responded_at = now()
  where i.id = v_inv.id;

  perform private.write_audit(
    v_inv.organization_id, 'invitation.accepted', 'invitation', v_inv.id::text,
    jsonb_build_object('email', v_inv.email, 'role', v_inv.role, 'user_id', v_uid)
  );

  perform private.notify(
    v_uid, v_inv.organization_id, 'membership',
    'Welcome to ' || v_org.name,
    'You joined as ' || replace(v_inv.role::text, '_', ' ') || '.',
    '/dashboard'
  );

  if v_inv.invited_by is not null then
    perform private.notify(
      v_inv.invited_by, v_inv.organization_id, 'membership',
      private.profile_label(v_uid) || ' accepted your invitation',
      'They joined ' || v_org.name || ' as ' || replace(v_inv.role::text, '_', ' ') || '.',
      null
    );
  end if;

  return query select v_org.id, v_org.slug, v_inv.role;
end;
$$;

create function public.accept_invitation(p_token text)
returns table (organization_id uuid, organization_slug text, member_role public.org_role)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  perform private.require_user();
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then
    raise exception 'invitation_not_found' using errcode = 'P0001';
  end if;

  select i.id into v_id
  from public.invitations i
  where i.token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex');

  if v_id is null then
    raise exception 'invitation_not_found' using errcode = 'P0001';
  end if;

  return query select * from private.accept_invitation(v_id);
end;
$$;

create function public.accept_invitation_by_id(p_invitation_id uuid)
returns table (organization_id uuid, organization_slug text, member_role public.org_role)
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query select * from private.accept_invitation(p_invitation_id);
end;
$$;

create function public.decline_invitation(p_invitation_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  v_email text := private.current_user_email();
  v_inv record;
begin
  select i.id, i.organization_id, i.email, i.status
  into v_inv
  from public.invitations i
  where i.id = p_invitation_id
  for update;

  if not found or v_email is null or v_inv.email <> v_email then
    raise exception 'invitation_not_found' using errcode = 'P0001';
  end if;

  if v_inv.status <> 'pending' then
    raise exception 'invitation_not_pending' using errcode = 'P0001';
  end if;

  update public.invitations i
  set status = 'declined', responded_by = v_uid, responded_at = now()
  where i.id = p_invitation_id;

  perform private.write_audit(
    v_inv.organization_id, 'invitation.declined', 'invitation', p_invitation_id::text,
    jsonb_build_object('email', v_inv.email)
  );
end;
$$;

-- Public preview for the invitation landing page. Possession of the token is
-- required; the invited address is masked.
create function public.get_invitation_preview(p_token text)
returns table (
  organization_name text,
  organization_slug text,
  role public.org_role,
  email_hint text,
  status public.invitation_status,
  expires_at timestamptz,
  is_expired boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    o.name,
    o.slug,
    i.role,
    left(split_part(i.email, '@', 1), 1) || '•••@' || split_part(i.email, '@', 2),
    i.status,
    i.expires_at,
    i.expires_at <= now()
  from public.invitations i
  join public.organizations o on o.id = i.organization_id
  where p_token ~ '^[0-9a-f]{64}$'
    and i.token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex');
$$;

create function public.list_my_invitations()
returns table (
  invitation_id uuid,
  organization_name text,
  organization_slug text,
  role public.org_role,
  invited_by_name text,
  expires_at timestamptz,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    i.id,
    o.name,
    o.slug,
    i.role,
    case when i.invited_by is null then null else private.profile_label(i.invited_by) end,
    i.expires_at,
    i.created_at
  from public.invitations i
  join public.organizations o on o.id = i.organization_id
  where i.email = private.current_user_email()
    and i.status = 'pending'
    and i.expires_at > now()
    and o.status = 'active'
  order by i.created_at desc;
$$;

-- ---------------------------------------------------------------------------
-- Membership management
-- ---------------------------------------------------------------------------

create function public.update_member_role(p_organization_id uuid, p_user_id uuid, p_role public.org_role)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  v_current public.org_role;
  v_org_name text;
begin
  if not private.has_org_permission(p_organization_id, 'members.manage') then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  perform private.lock_org_admins(p_organization_id);

  select m.role into v_current
  from public.organization_members m
  where m.organization_id = p_organization_id and m.user_id = p_user_id
  for update;

  if v_current is null then
    raise exception 'member_not_found' using errcode = 'P0001';
  end if;

  if v_current = p_role then
    return;
  end if;

  if v_current = 'org_admin' and not private.other_active_admin_exists(p_organization_id, p_user_id) then
    raise exception 'last_admin' using errcode = 'P0001';
  end if;

  update public.organization_members m
  set role = p_role
  where m.organization_id = p_organization_id and m.user_id = p_user_id;

  perform private.write_audit(
    p_organization_id, 'member.role_changed', 'user', p_user_id::text,
    jsonb_build_object('from', v_current, 'to', p_role)
  );

  if p_user_id <> v_uid then
    select o.name into v_org_name from public.organizations o where o.id = p_organization_id;
    perform private.notify(
      p_user_id, p_organization_id, 'membership',
      'Your role in ' || v_org_name || ' changed',
      'You are now ' || replace(p_role::text, '_', ' ') || '.',
      '/dashboard'
    );
  end if;
end;
$$;

create function public.remove_member(p_organization_id uuid, p_user_id uuid)
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

-- ---------------------------------------------------------------------------
-- Auth event logging (sign-in, sign-out, password changes)
-- ---------------------------------------------------------------------------

create function public.log_auth_event(p_event text, p_method text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
begin
  if p_event not in ('auth.sign_in', 'auth.sign_out', 'auth.password_changed', 'auth.email_verified') then
    raise exception 'invalid_input' using errcode = 'P0001';
  end if;
  if p_method is not null and p_method not in ('password', 'google', 'email_link', 'recovery') then
    raise exception 'invalid_input' using errcode = 'P0001';
  end if;

  -- Throttle to keep the log meaningful if the RPC is called directly.
  if (
    select count(*) from public.audit_logs a
    where a.actor_id = v_uid and a.action = p_event and a.created_at > now() - interval '1 minute'
  ) >= 10 then
    return;
  end if;

  perform private.write_audit(
    null, p_event, 'user', v_uid::text,
    case when p_method is null then '{}'::jsonb else jsonb_build_object('method', p_method) end
  );

  if p_event = 'auth.password_changed' then
    perform private.notify(
      v_uid, null, 'security', 'Your password was changed',
      'If you did not make this change, reset your password immediately.', '/settings/security'
    );
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------------------------

create function public.mark_notifications_read(p_notification_ids uuid[] default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  v_count integer;
begin
  update public.notifications n
  set read_at = now()
  where n.user_id = v_uid
    and n.read_at is null
    and (p_notification_ids is null or n.id = any (p_notification_ids));
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- ---------------------------------------------------------------------------
-- Contact form (anonymous allowed)
-- ---------------------------------------------------------------------------

create function public.submit_contact_request(
  p_name text,
  p_email text,
  p_organization text,
  p_topic public.contact_topic,
  p_message text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_name text := btrim(coalesce(p_name, ''));
  v_org text := nullif(btrim(coalesce(p_organization, '')), '');
  v_message text := btrim(coalesce(p_message, ''));
  v_id uuid;
begin
  if char_length(v_name) not between 1 and 120
    or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or char_length(v_email) > 320
    or (v_org is not null and char_length(v_org) > 160)
    or char_length(v_message) not between 10 and 4000
    or p_topic is null then
    raise exception 'invalid_input' using errcode = 'P0001';
  end if;

  if (
    select count(*) from public.contact_requests c
    where c.email = v_email and c.created_at > now() - interval '1 hour'
  ) >= 5 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;

  insert into public.contact_requests (name, email, organization, topic, message, submitted_by)
  values (v_name, v_email, v_org, p_topic, v_message, auth.uid())
  returning id into v_id;

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Function privileges: deny by default, grant explicitly.
-- ---------------------------------------------------------------------------

revoke all on all functions in schema private from public;
grant execute on function private.is_super_admin() to authenticated;
grant execute on function private.is_org_member(uuid) to authenticated;
grant execute on function private.has_org_permission(uuid, text) to authenticated;
grant execute on function private.can_view_profile(uuid) to authenticated;

revoke all on all functions in schema public from public, anon, authenticated;

grant execute on function public.complete_onboarding(text, text, text) to authenticated;
grant execute on function public.create_organization(text, text, public.organization_type) to authenticated;
grant execute on function public.set_organization_status(uuid, public.organization_status) to authenticated;
grant execute on function public.create_invitation(uuid, text, public.org_role) to authenticated;
grant execute on function public.revoke_invitation(uuid) to authenticated;
grant execute on function public.accept_invitation(text) to authenticated;
grant execute on function public.accept_invitation_by_id(uuid) to authenticated;
grant execute on function public.decline_invitation(uuid) to authenticated;
grant execute on function public.get_invitation_preview(text) to anon, authenticated;
grant execute on function public.list_my_invitations() to authenticated;
grant execute on function public.update_member_role(uuid, uuid, public.org_role) to authenticated;
grant execute on function public.remove_member(uuid, uuid) to authenticated;
grant execute on function public.log_auth_event(text, text) to authenticated;
grant execute on function public.mark_notifications_read(uuid[]) to authenticated;
grant execute on function public.submit_contact_request(text, text, text, public.contact_topic, text) to anon, authenticated;

-- NextCampus Phase 1.5: translatable notifications.
--
-- Notifications gain a `template` key and `params`. The UI renders
-- messages `notifications.templates.<template>` with those params in the
-- reader's language; title/body remain as an English fallback for rows
-- created before this migration and for clients without the template.
--
-- The RPCs that notify are redefined with identical logic; only their
-- private.notify(...) calls change to private.notify_template(...).
--
-- Rollback: supabase/rollbacks/20261030000400_notification_templates.down.sql

alter table public.notifications
  add column template text check (template is null or template ~ '^[a-z][a-z_]{1,63}$'),
  add column params jsonb not null default '{}'::jsonb check (jsonb_typeof(params) = 'object');

create function private.notify_template(
  p_user_id uuid,
  p_organization_id uuid,
  p_kind public.notification_kind,
  p_template text,
  p_params jsonb,
  p_title text,
  p_body text,
  p_action_url text
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.notifications (user_id, organization_id, kind, template, params, title, body, action_url)
  values (p_user_id, p_organization_id, p_kind, p_template, coalesce(p_params, '{}'::jsonb),
          left(p_title, 160), left(p_body, 1000), p_action_url);
$$;

create or replace function public.create_invitation(p_organization_id uuid, p_email text, p_role public.org_role)
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
    perform private.notify_template(
      v_invitee, null, 'invitation', 'invitation_received',
      jsonb_build_object('organization', v_org_name, 'role', p_role),
      'You have been invited to join ' || v_org_name,
      'Review the invitation to join as ' || replace(p_role::text, '_', ' ') || '.',
      '/invitations'
    );
  end if;

  return query select v_id, v_token, v_expires;
end;
$$;

create or replace function private.accept_invitation(p_invitation_id uuid)
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

  perform private.notify_template(
    v_uid, v_inv.organization_id, 'membership', 'membership_welcome',
    jsonb_build_object('organization', v_org.name, 'role', v_inv.role),
    'Welcome to ' || v_org.name,
    'You joined as ' || replace(v_inv.role::text, '_', ' ') || '.',
    '/dashboard'
  );

  if v_inv.invited_by is not null then
    perform private.notify_template(
      v_inv.invited_by, v_inv.organization_id, 'membership', 'invitation_accepted',
      jsonb_build_object('name', private.profile_label(v_uid), 'organization', v_org.name, 'role', v_inv.role),
      private.profile_label(v_uid) || ' accepted your invitation',
      'They joined ' || v_org.name || ' as ' || replace(v_inv.role::text, '_', ' ') || '.',
      null
    );
  end if;

  return query select v_org.id, v_org.slug, v_inv.role;
end;
$$;

create or replace function public.update_member_role(p_organization_id uuid, p_user_id uuid, p_role public.org_role)
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
    perform private.notify_template(
      p_user_id, p_organization_id, 'membership', 'role_changed',
      jsonb_build_object('organization', v_org_name, 'role', p_role),
      'Your role in ' || v_org_name || ' changed',
      'You are now ' || replace(p_role::text, '_', ' ') || '.',
      '/dashboard'
    );
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
    perform private.notify_template(
      p_user_id, null, 'membership', 'member_removed',
      jsonb_build_object('organization', v_org_name),
      'You were removed from ' || v_org_name,
      'Contact an administrator of the organization if you think this is a mistake.',
      null
    );
  end if;
end;
$$;

create or replace function public.log_auth_event(p_event text, p_method text default null)
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
    perform private.notify_template(
      v_uid, null, 'security', 'password_changed', '{}'::jsonb, 'Your password was changed',
      'If you did not make this change, reset your password immediately.', '/settings/security'
    );
  end if;
end;
$$;

revoke all on function private.notify_template(uuid, uuid, public.notification_kind, text, jsonb, text, text, text) from public;

-- Rollback for 20261101000100_platform_admin_roles.sql.
-- Keeps every existing platform admin (including the primary) as a plain row
-- in public.platform_admins; only the slot/primary model and its RPCs are removed.
begin;

drop function if exists public.revoke_platform_admin(uuid);
drop function if exists public.grant_platform_admin(text);
drop function if exists private.transfer_primary_admin(text);
drop function if exists private.bootstrap_primary_admin(text);
drop function if exists private.is_primary_admin();

drop trigger if exists platform_admins_guard on public.platform_admins;
drop function if exists private.platform_admin_guard();

alter table public.platform_admins
  drop constraint if exists platform_admins_primary_slot,
  drop constraint if exists platform_admins_slot_unique,
  drop constraint if exists platform_admins_slot_range,
  drop column if exists slot,
  drop column if exists is_primary;

commit;

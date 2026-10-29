-- Rollback for 20261030000200_locale_preferences.sql.
begin;
revoke update (preferred_locale, preferred_numerals) on public.profiles from authenticated;
comment on column public.profiles.locale is null;
alter table public.profiles drop column preferred_numerals, drop column preferred_locale;
commit;

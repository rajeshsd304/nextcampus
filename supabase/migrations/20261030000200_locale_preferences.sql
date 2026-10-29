-- NextCampus Phase 1.5: per-user language and numeral preferences.
--
-- preferred_locale: UI language chosen by the user (null = not chosen yet; the
--   app falls back to the locale cookie, then to the default `bn`). The check
--   is a format check so adding a locale needs no migration — the application
--   validates against its configured locale list.
-- preferred_numerals: `beng` (০১২…) or `latn` (012…); null = the locale default.
--
-- The Phase 1 `locale` column is left untouched (unused by the UI) to keep this
-- migration purely additive.
--
-- Rollback: supabase/rollbacks/20261030000200_locale_preferences.down.sql

alter table public.profiles
  add column preferred_locale text check (preferred_locale is null or preferred_locale ~ '^[a-z]{2}(-[A-Z]{2})?$'),
  add column preferred_numerals text check (preferred_numerals is null or preferred_numerals in ('beng', 'latn'));

comment on column public.profiles.locale is 'Deprecated (Phase 1). Use preferred_locale.';

grant update (preferred_locale, preferred_numerals) on public.profiles to authenticated;

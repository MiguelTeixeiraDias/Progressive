-- Per-user list of built-in (default) exercises the user has hidden/deleted.
-- Stored on the profile so it only affects that account; custom exercises are
-- deleted outright from public.exercises instead of being listed here.
alter table public.profiles
  add column if not exists hidden_exercise_ids text[] not null default array[]::text[];

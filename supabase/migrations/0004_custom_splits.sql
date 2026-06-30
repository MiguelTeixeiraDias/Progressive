-- User-defined training splits, stored on the profile as JSON. Each split has a
-- name and an ordered list of days ({ name, muscleGroups }). active_split_id
-- selects which one drives the "Train Next" suggestion when the preferred split
-- is 'Custom'.
alter table public.profiles
  add column if not exists custom_splits jsonb not null default '[]'::jsonb,
  add column if not exists active_split_id text;

-- Per-muscle-group accent color overrides, stored on the profile as JSON
-- ({ "Chest": "#FF6B6B", ... }). Unset groups fall back to the app's lime accent.
alter table public.profiles
  add column if not exists muscle_colors jsonb not null default '{}'::jsonb;

-- Drop sets (chained weight-drop stages on a set), supersets (exercises linked
-- to be performed back-to-back) and cardio sets (timed instead of weight/reps).

alter table public.sets add column if not exists duration_sec integer;
alter table public.sets add column if not exists drops jsonb not null default '[]'::jsonb;

alter table public.workout_exercises add column if not exists superset_id text;

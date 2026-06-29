-- Progressive — initial schema
-- Postgres (Supabase). Entity ids are TEXT to match the app's client-generated
-- ids (uid() -> "w_...", default exercises like "ex_squat"). user_id is the uuid
-- from auth.users and is denormalized onto every table so RLS is a trivial
-- `auth.uid() = user_id` check with no joins. Child rows carry a `position` so the
-- client can rebuild ordered arrays (exercises within a workout, sets within an
-- exercise, etc.).

-- ---------------------------------------------------------------------------
-- profiles (1:1 with auth.users) — flattened Settings blob
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id                  uuid primary key references auth.users (id) on delete cascade,
  user_name           text    not null default 'Athlete',
  weekly_goal         integer not null default 4,
  unit                text    not null default 'kg' check (unit in ('kg', 'lb')),
  -- profile
  email               text,
  experience_level    text,
  preferred_split     text,
  -- goals
  primary_fitness_goal text,
  target_body_weight  numeric,
  focus_muscle_group  text,
  -- body stats
  current_weight      numeric,
  height              numeric,
  -- progress "key lifts" tiles
  featured_exercises  text[]  not null default array['ex_squat','ex_bench_press','ex_deadlift'],
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- exercises — custom (user-created) exercises only. The default library ships
-- in the app (src/data/exercises.ts) and is merged client-side.
-- ---------------------------------------------------------------------------
create table if not exists public.exercises (
  id           text primary key,
  user_id      uuid not null references auth.users (id) on delete cascade,
  name         text not null,
  muscle_group text not null,
  is_custom    boolean not null default true,
  created_at   timestamptz not null default now()
);
create index if not exists exercises_user_id_idx on public.exercises (user_id);

-- ---------------------------------------------------------------------------
-- templates + template_exercises
-- ---------------------------------------------------------------------------
create table if not exists public.templates (
  id         text primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  name       text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists templates_user_id_idx on public.templates (user_id);

create table if not exists public.template_exercises (
  id            text primary key,
  template_id   text not null references public.templates (id) on delete cascade,
  user_id       uuid not null references auth.users (id) on delete cascade,
  exercise_id   text not null,
  exercise_name text not null,
  muscle_group  text not null,
  notes         text,
  position      integer not null default 0
);
create index if not exists template_exercises_template_id_idx on public.template_exercises (template_id);
create index if not exists template_exercises_user_id_idx on public.template_exercises (user_id);

-- ---------------------------------------------------------------------------
-- workouts + workout_exercises + sets (completed history)
-- ---------------------------------------------------------------------------
create table if not exists public.workouts (
  id           text primary key,
  user_id      uuid not null references auth.users (id) on delete cascade,
  name         text not null,
  date         text not null,            -- ISO start date
  started_at   bigint not null,          -- epoch ms
  ended_at     bigint,                   -- epoch ms
  duration_sec integer not null default 0,
  total_volume numeric not null default 0,
  completed    boolean not null default true,
  created_at   timestamptz not null default now()
);
create index if not exists workouts_user_id_idx on public.workouts (user_id);

create table if not exists public.workout_exercises (
  id           text primary key,
  workout_id   text not null references public.workouts (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  exercise_id  text not null,
  name         text not null,            -- denormalized snapshot
  muscle_group text not null,
  notes        text,
  position     integer not null default 0
);
create index if not exists workout_exercises_workout_id_idx on public.workout_exercises (workout_id);
create index if not exists workout_exercises_user_id_idx on public.workout_exercises (user_id);

create table if not exists public.sets (
  id                  text primary key,
  workout_exercise_id text not null references public.workout_exercises (id) on delete cascade,
  user_id             uuid not null references auth.users (id) on delete cascade,
  reps                integer not null default 0,
  weight              numeric not null default 0,
  completed           boolean not null default false,
  position            integer not null default 0
);
create index if not exists sets_workout_exercise_id_idx on public.sets (workout_exercise_id);
create index if not exists sets_user_id_idx on public.sets (user_id);

-- ---------------------------------------------------------------------------
-- Row Level Security — owner-only access on every table
-- ---------------------------------------------------------------------------
alter table public.profiles           enable row level security;
alter table public.exercises          enable row level security;
alter table public.templates          enable row level security;
alter table public.template_exercises enable row level security;
alter table public.workouts           enable row level security;
alter table public.workout_exercises  enable row level security;
alter table public.sets               enable row level security;

-- profiles keys on `id` (= auth.users.id); everything else on `user_id`.
create policy "profiles_select" on public.profiles for select using (auth.uid() = id);
create policy "profiles_insert" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "profiles_delete" on public.profiles for delete using (auth.uid() = id);

do $$
declare
  t text;
begin
  foreach t in array array[
    'exercises','templates','template_exercises','workouts','workout_exercises','sets'
  ]
  loop
    execute format('create policy "%1$s_select" on public.%1$s for select using (auth.uid() = user_id);', t);
    execute format('create policy "%1$s_insert" on public.%1$s for insert with check (auth.uid() = user_id);', t);
    execute format('create policy "%1$s_update" on public.%1$s for update using (auth.uid() = user_id) with check (auth.uid() = user_id);', t);
    execute format('create policy "%1$s_delete" on public.%1$s for delete using (auth.uid() = user_id);', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Auto-create a profile row whenever a new auth user signs up.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

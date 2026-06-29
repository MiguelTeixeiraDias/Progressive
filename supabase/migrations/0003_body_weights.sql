-- Per-user bodyweight history: one measurement per day, used for the trend
-- chart on Progress. Weight is stored in the unit the user logged it in.
create table if not exists public.body_weights (
  id         text primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  date       text not null,          -- yyyy-mm-dd (local day key)
  weight     numeric not null,
  logged_at  bigint not null,        -- epoch ms
  unique (user_id, date)
);
create index if not exists body_weights_user_id_idx on public.body_weights (user_id);

alter table public.body_weights enable row level security;

create policy "body_weights_select" on public.body_weights for select using (auth.uid() = user_id);
create policy "body_weights_insert" on public.body_weights for insert with check (auth.uid() = user_id);
create policy "body_weights_update" on public.body_weights for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "body_weights_delete" on public.body_weights for delete using (auth.uid() = user_id);

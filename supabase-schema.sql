-- Run only inside an EXISTING Supabase project, in its SQL editor.
-- Namespaced to avoid collisions with other CrownMind projects.
create table if not exists public.stonino_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  candles jsonb not null default '[]'::jsonb,
  novena_candles jsonb not null default '[]'::jsonb,
  novena_flowers jsonb not null default '[]'::jsonb,
  intentions jsonb not null default '[]'::jsonb,
  completed jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  constraint stonino_novena_flowers_array check (jsonb_typeof(novena_flowers)='array'),
  constraint stonino_novena_candles_array check (jsonb_typeof(novena_candles)='array'),
  constraint stonino_candles_array check (jsonb_typeof(candles)='array'),
  constraint stonino_intentions_array check (jsonb_typeof(intentions)='array'),
  constraint stonino_completed_array check (jsonb_typeof(completed)='array')
);
alter table public.stonino_profiles enable row level security;
create policy "stonino_read_own" on public.stonino_profiles for select to authenticated using ((select auth.uid()) = user_id);
create policy "stonino_insert_own" on public.stonino_profiles for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "stonino_update_own" on public.stonino_profiles for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "stonino_delete_own" on public.stonino_profiles for delete to authenticated using ((select auth.uid()) = user_id);
revoke all on public.stonino_profiles from anon;
grant select,insert,update,delete on public.stonino_profiles to authenticated;

-- For already-created databases run this migration once (safe to rerun):
alter table public.stonino_profiles add column if not exists novena_candles jsonb not null default '[]'::jsonb;

-- v2.4: independent novena flower offerings for existing accounts
alter table public.stonino_profiles add column if not exists novena_flowers jsonb not null default '[]'::jsonb;

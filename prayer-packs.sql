-- Apply once after the Sto. Niño profile schema, before publishing this web source.
begin;

create schema if not exists stonino_private;
grant usage on schema stonino_private to authenticated;

create table public.stonino_prayer_wallets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance integer not null default 0 check (balance >= 0)
);
create table public.stonino_prayer_pack_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  credits integer not null check (credits in (20, 50, 100, 200)),
  provider_id text unique,
  checkout_url text,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);
create index stonino_pack_orders_user on public.stonino_prayer_pack_orders (user_id, created_at desc);

create table stonino_private.offering_requests (
  user_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid not null,
  primary key (user_id, request_id)
);

alter table public.stonino_prayer_wallets enable row level security;
alter table public.stonino_prayer_pack_orders enable row level security;
revoke all on public.stonino_prayer_wallets, public.stonino_prayer_pack_orders from public, anon, authenticated;
grant select on public.stonino_prayer_wallets to authenticated;
grant select, insert, update on public.stonino_prayer_pack_orders to service_role;
create policy stonino_read_wallet on public.stonino_prayer_wallets for select to authenticated
  using ((select auth.uid()) = user_id);

-- Ordinary profile writes can still sync prayers and completion, but only RPCs write offerings.
revoke insert, update, delete on public.stonino_profiles from public, anon, authenticated;
grant insert (user_id, intentions, completed, updated_at),
      update (user_id, intentions, completed, updated_at)
  on public.stonino_profiles to authenticated;

create function stonino_private.spend_prayer_credit(
  request_id uuid, offering_kind text, prayer_type text, prayer_index integer, note text, novena_day integer
) returns void language plpgsql security definer set search_path = '' as $$
declare
  owner_id uuid := auth.uid();
  now_at timestamptz := pg_catalog.now();
  cebu_day date := (now_at at time zone 'Asia/Manila')::date;
  novena_year integer := greatest(2027, extract(year from cebu_day)::integer);
  january_15 date := pg_catalog.make_date(novena_year, 1, 15);
  offering jsonb;
begin
  if owner_id is null or coalesce(auth.jwt()->>'is_anonymous', 'false') = 'true' then
    raise exception 'sign_in_required';
  end if;
  if request_id is null or offering_kind is null or
     offering_kind not in ('candle', 'flowers', 'novena-candle', 'novena-flowers') or
     prayer_type is null or prayer_type not in ('Personal prayer', 'Family', 'Thanksgiving', 'For the departed') or
     (prayer_index is not null and prayer_index not between 0 and 6) or
     pg_catalog.char_length(coalesce(note, '')) > 250 then
    raise exception 'invalid_offering';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('stonino:' || owner_id::text, 0));
  insert into stonino_private.offering_requests values (owner_id, request_id) on conflict do nothing;
  if not found then return; end if;

  if offering_kind like 'novena-%' then
    if novena_day is null or novena_day not between 0 and 8 or
       cebu_day < january_15 + ((7 - extract(dow from january_15)::integer) % 7) - 10 + novena_day then
      raise exception 'novena_day_unavailable';
    end if;
  elsif novena_day is not null then
    raise exception 'invalid_offering';
  end if;

  update public.stonino_prayer_wallets set balance = balance - 1
    where user_id = owner_id and balance > 0;
  if not found then raise exception 'prayer_pack_empty'; end if;

  offering := pg_catalog.jsonb_strip_nulls(pg_catalog.jsonb_build_object(
    'id', request_id, 'note', coalesce(note, ''), 'type', prayer_type,
    'prayerIndex', prayer_index, 'created_at', pg_catalog.to_char(now_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'), 'novena_day', novena_day
  ));
  insert into public.stonino_profiles (user_id) values (owner_id) on conflict do nothing;
  if offering_kind = 'candle' then
    update public.stonino_profiles set candles = pg_catalog.jsonb_build_array(offering) ||
      pg_catalog.jsonb_path_query_array(candles, '$[*] ? (@.created_at > $cutoff)',
        pg_catalog.jsonb_build_object('cutoff', pg_catalog.to_char((now_at - interval '24 hours') at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')), true),
      updated_at = now_at where user_id = owner_id;
  elsif offering_kind = 'novena-candle' then
    update public.stonino_profiles set novena_candles = pg_catalog.jsonb_build_array(offering) ||
      pg_catalog.jsonb_path_query_array(novena_candles, '$[*] ? (@.created_at > $cutoff)',
        pg_catalog.jsonb_build_object('cutoff', pg_catalog.to_char((now_at - interval '24 hours') at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')), true),
      updated_at = now_at where user_id = owner_id;
  else
    update public.stonino_profiles set novena_flowers = pg_catalog.jsonb_build_array(offering) || novena_flowers,
      updated_at = now_at where user_id = owner_id;
  end if;
end;
$$;

create function public.stonino_spend_prayer_credit(
  request_id uuid, offering_kind text, prayer_type text, prayer_index integer, note text, novena_day integer
) returns void language sql security invoker set search_path = '' as $$
  select stonino_private.spend_prayer_credit(request_id, offering_kind, prayer_type, prayer_index, note, novena_day);
$$;

create function stonino_private.clear_offerings() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or coalesce(auth.jwt()->>'is_anonymous', 'false') = 'true' then
    raise exception 'sign_in_required';
  end if;
  update public.stonino_profiles set candles = '[]', novena_candles = '[]', novena_flowers = '[]',
    updated_at = pg_catalog.now() where user_id = auth.uid();
end;
$$;

create function public.stonino_clear_offerings() returns void language sql security invoker set search_path = '' as $$
  select stonino_private.clear_offerings();
$$;

create function stonino_private.delete_devotional_profile() returns void
language plpgsql security definer set search_path = '' as $$
declare owner_id uuid := auth.uid();
begin
  if owner_id is null or coalesce(auth.jwt()->>'is_anonymous', 'false') = 'true' then
    raise exception 'sign_in_required';
  end if;
  update public.stonino_prayer_pack_orders set user_id = null, checkout_url = null
    where user_id = owner_id;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('stonino:' || owner_id::text, 0));
  delete from public.stonino_prayer_wallets where user_id = owner_id;
  delete from stonino_private.offering_requests where user_id = owner_id;
  delete from public.stonino_profiles where user_id = owner_id;
end;
$$;

create function public.stonino_delete_devotional_profile() returns void
language sql security invoker set search_path = '' as $$
  select stonino_private.delete_devotional_profile();
$$;

-- Only the server can settle a pack, after independently verifying the merchant payment.
create function public.stonino_settle_prayer_pack(order_id uuid, verified_provider_id text, paid_centavos integer)
returns void language plpgsql security invoker set search_path = '' as $$
declare
  pack public.stonino_prayer_pack_orders%rowtype;
begin
  select * into strict pack from public.stonino_prayer_pack_orders where id = order_id for update;
  if pack.provider_id is null or pack.provider_id is distinct from verified_provider_id or
     pack.credits * 100 is distinct from paid_centavos then
    raise exception 'invalid_prayer_pack_payment';
  end if;
  if pack.paid_at is not null then return; end if;
  if pack.user_id is null then raise exception 'prayer_pack_account_missing'; end if;
  insert into public.stonino_prayer_wallets (user_id, balance) values (pack.user_id, pack.credits)
    on conflict (user_id) do update set balance = stonino_prayer_wallets.balance + excluded.balance;
  update public.stonino_prayer_pack_orders set paid_at = pg_catalog.now() where id = order_id;
end;
$$;

revoke all on function
  stonino_private.spend_prayer_credit(uuid, text, text, integer, text, integer),
  public.stonino_spend_prayer_credit(uuid, text, text, integer, text, integer),
  stonino_private.clear_offerings(), public.stonino_clear_offerings(),
  stonino_private.delete_devotional_profile(), public.stonino_delete_devotional_profile(),
  public.stonino_settle_prayer_pack(uuid, text, integer) from public, anon, authenticated;
grant execute on function
  stonino_private.spend_prayer_credit(uuid, text, text, integer, text, integer),
  public.stonino_spend_prayer_credit(uuid, text, text, integer, text, integer),
  stonino_private.clear_offerings(), public.stonino_clear_offerings(),
  stonino_private.delete_devotional_profile(), public.stonino_delete_devotional_profile() to authenticated;
grant select, insert, update on public.stonino_prayer_wallets to service_role;
grant execute on function public.stonino_settle_prayer_pack(uuid, text, integer) to service_role;
commit;

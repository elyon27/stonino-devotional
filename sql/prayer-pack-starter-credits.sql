begin;

-- Keep the grant separate from the wallet so clearing devotional data does
-- not make the same signed-in account eligible again.
create table if not exists stonino_private.starter_credit_grants (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table stonino_private.starter_credit_grants enable row level security;
revoke all on stonino_private.starter_credit_grants from public, anon, authenticated;

create or replace function stonino_private.claim_starter_prayer_credits()
returns integer language plpgsql security definer set search_path = '' as $$
declare
  owner_id uuid := auth.uid();
  current_balance integer;
begin
  if owner_id is null or coalesce(auth.jwt()->>'is_anonymous', 'false') = 'true' then
    raise exception 'sign_in_required';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('stonino:' || owner_id::text, 0));
  insert into stonino_private.starter_credit_grants (user_id)
    values (owner_id) on conflict do nothing;
  if found then
    insert into public.stonino_prayer_wallets (user_id, balance) values (owner_id, 10)
      on conflict (user_id) do update set balance = stonino_prayer_wallets.balance + excluded.balance;
  end if;

  select balance into current_balance from public.stonino_prayer_wallets where user_id = owner_id;
  return coalesce(current_balance, 0);
end;
$$;

create or replace function public.stonino_claim_starter_prayer_credits()
returns integer language sql security invoker set search_path = '' as $$
  select stonino_private.claim_starter_prayer_credits();
$$;

-- Existing Android and web clients use this same offering endpoint.
create or replace function public.stonino_spend_prayer_credit(
  request_id uuid, offering_kind text, prayer_type text, prayer_index integer, note text, novena_day integer
) returns void language plpgsql security invoker set search_path = '' as $$
begin
  perform stonino_private.claim_starter_prayer_credits();
  perform stonino_private.spend_prayer_credit(request_id, offering_kind, prayer_type, prayer_index, note, novena_day);
end;
$$;

revoke all on function stonino_private.claim_starter_prayer_credits(),
  public.stonino_claim_starter_prayer_credits() from public, anon, authenticated;
grant execute on function stonino_private.claim_starter_prayer_credits(),
  public.stonino_claim_starter_prayer_credits() to authenticated;

commit;

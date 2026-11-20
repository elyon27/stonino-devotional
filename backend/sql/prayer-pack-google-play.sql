begin;

create or replace function public.stonino_credit_play_prayer_pack(
  owner_id uuid, purchase_id text, pack_credits integer, already_consumed boolean
) returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  inserted_id uuid;
begin
  if owner_id is null or purchase_id is null or
     purchase_id !~ '^google-play:[0-9a-f]{64}$' or
     pack_credits is null or pack_credits not in (50, 150, 250, 500) or
     already_consumed is null then
    return false;
  end if;

  if not already_consumed then
    insert into public.stonino_prayer_pack_orders (user_id, provider_id, credits, paid_at)
    values (owner_id, purchase_id, pack_credits, now())
    on conflict (provider_id) do nothing
    returning id into inserted_id;

    if inserted_id is not null then
      insert into public.stonino_prayer_wallets (user_id, balance)
      values (owner_id, pack_credits)
      on conflict (user_id) do update
      set balance = stonino_prayer_wallets.balance + excluded.balance;
      return true;
    end if;
  end if;

  return exists (
    select 1 from public.stonino_prayer_pack_orders
    where provider_id = purchase_id and user_id = owner_id
      and credits = pack_credits and paid_at is not null
  );
end;
$$;

revoke all on function public.stonino_credit_play_prayer_pack(uuid, text, integer, boolean)
  from public, anon, authenticated;
grant execute on function public.stonino_credit_play_prayer_pack(uuid, text, integer, boolean)
  to service_role;

commit;

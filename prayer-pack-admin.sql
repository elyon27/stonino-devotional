-- Apply after prayer-packs.sql, before deploying the admin checkout update.
begin;
alter table public.stonino_prayer_pack_orders
  add column if not exists payment_reference text,
  add column if not exists submitted_at timestamptz,
  add column if not exists notification_sent_at timestamptz,
  add column if not exists declined_at timestamptz,
  add column if not exists reference_resolved_at timestamptz,
  add column if not exists replacement_order_id uuid;

create or replace function public.stonino_resolve_declined_reference(
  owner_id uuid, order_id uuid, corrected_reference text, corrected_provider_id text
)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  original public.stonino_prayer_pack_orders%rowtype;
  replacement_id uuid;
begin
  select * into original from public.stonino_prayer_pack_orders
    where id = order_id and user_id = owner_id and declined_at is not null
      and paid_at is null and payment_reference is not null
    for update;
  if not found then raise exception 'declined_reference_unavailable'; end if;

  if original.reference_resolved_at is not null then
    if corrected_reference is null and original.replacement_order_id is null then return null; end if;
    select id into replacement_id from public.stonino_prayer_pack_orders
      where id = original.replacement_order_id and user_id = owner_id
        and provider_id = corrected_provider_id;
    if found then return replacement_id; end if;
    raise exception 'declined_reference_unavailable';
  end if;

  if corrected_reference is not null then
    insert into public.stonino_prayer_pack_orders
      (user_id, credits, provider_id, payment_reference, submitted_at)
    values (owner_id, original.credits, corrected_provider_id, corrected_reference, pg_catalog.now())
    returning id into replacement_id;
  end if;

  update public.stonino_prayer_pack_orders
    set reference_resolved_at = pg_catalog.now(), replacement_order_id = replacement_id
    where id = original.id;
  return replacement_id;
end;
$$;
revoke all on function public.stonino_resolve_declined_reference(uuid, uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.stonino_resolve_declined_reference(uuid, uuid, text, text) to service_role;

create or replace function public.stonino_admin_pending_payments(page_offset integer)
returns table (id uuid, email text, credits integer, payment_reference text, submitted_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select o.id, u.email::text, o.credits, o.payment_reference, o.submitted_at
  from public.stonino_prayer_pack_orders o
  join auth.users u on u.id = o.user_id
  where o.payment_reference is not null and o.paid_at is null and o.declined_at is null
  order by o.submitted_at desc, o.id desc
  limit 51 offset greatest(0, page_offset);
$$;
revoke all on function public.stonino_admin_pending_payments(integer) from public, anon, authenticated;
grant execute on function public.stonino_admin_pending_payments(integer) to service_role;

create or replace function public.stonino_settle_prayer_pack(order_id uuid, verified_provider_id text, paid_centavos integer)
returns void language plpgsql security invoker set search_path = '' as $$
declare
  pack public.stonino_prayer_pack_orders%rowtype;
begin
  select * into strict pack from public.stonino_prayer_pack_orders where id = order_id for update;
  if pack.provider_id is null or pack.provider_id is distinct from verified_provider_id or
     pack.credits * 100 is distinct from paid_centavos then
    raise exception 'invalid_prayer_pack_payment';
  end if;
  if pack.declined_at is not null then raise exception 'prayer_pack_declined'; end if;
  if pack.paid_at is not null then return; end if;
  if pack.user_id is null then raise exception 'prayer_pack_account_missing'; end if;
  insert into public.stonino_prayer_wallets (user_id, balance) values (pack.user_id, pack.credits)
    on conflict (user_id) do update set balance = stonino_prayer_wallets.balance + excluded.balance;
  update public.stonino_prayer_pack_orders set paid_at = pg_catalog.now() where id = order_id;
end;
$$;

revoke all on function public.stonino_settle_prayer_pack(uuid, text, integer) from public, anon, authenticated;
grant execute on function public.stonino_settle_prayer_pack(uuid, text, integer) to service_role;

-- Clear the readable reference when a profile is deleted, retaining the digest for replay protection.
create or replace function stonino_private.clear_detached_payment_reference()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.user_id is null then new.payment_reference := null; end if;
  return new;
end;
$$;
drop trigger if exists stonino_clear_detached_reference on public.stonino_prayer_pack_orders;
create trigger stonino_clear_detached_reference before update of user_id
on public.stonino_prayer_pack_orders for each row
execute function stonino_private.clear_detached_payment_reference();
commit;

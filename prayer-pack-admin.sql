-- Apply after prayer-packs.sql, before deploying the admin checkout update.
begin;
alter table public.stonino_prayer_pack_orders
  add column if not exists payment_reference text,
  add column if not exists submitted_at timestamptz,
  add column if not exists notification_sent_at timestamptz;

create or replace function public.stonino_admin_pending_payments(page_offset integer)
returns table (id uuid, email text, credits integer, payment_reference text, submitted_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select o.id, u.email::text, o.credits, o.payment_reference, o.submitted_at
  from public.stonino_prayer_pack_orders o
  join auth.users u on u.id = o.user_id
  where o.payment_reference is not null and o.paid_at is null
  order by o.submitted_at desc, o.id desc
  limit 51 offset greatest(0, page_offset);
$$;
revoke all on function public.stonino_admin_pending_payments(integer) from public, anon, authenticated;
grant execute on function public.stonino_admin_pending_payments(integer) to service_role;

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

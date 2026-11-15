-- Keep older credit tiers valid for existing orders and installed apps.
alter table public.stonino_prayer_pack_orders
  drop constraint stonino_prayer_pack_orders_credits_check,
  add constraint stonino_prayer_pack_orders_credits_check
    check (credits in (20, 50, 100, 150, 200, 250, 500));

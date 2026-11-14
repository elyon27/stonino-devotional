-- Apply after prayer-pack-admin.sql.
begin;
create or replace function public.stonino_admin_members(page_offset integer)
returns table (email text, enrolled_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select u.email::text, u.created_at
  from auth.users u
  where u.email is not null and u.email_confirmed_at is not null
    and nullif(btrim(u.raw_user_meta_data->>'stonino_display_name'), '') is not null
  order by u.created_at desc, u.id desc
  limit 51 offset greatest(0, page_offset);
$$;
revoke all on function public.stonino_admin_members(integer) from public, anon, authenticated;
grant execute on function public.stonino_admin_members(integer) to service_role;
commit;

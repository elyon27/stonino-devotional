-- Apply after prayer-packs.sql, before deploying a client with quantity controls.
begin;

create or replace function public.stonino_spend_prayer_credits(
  request_ids uuid[], offering_kind text, prayer_type text, prayer_index integer, note text, novena_day integer
) returns void language plpgsql security invoker set search_path = '' as $$
declare
  item_id uuid;
begin
  if coalesce(pg_catalog.cardinality(request_ids), 0) = 0 then
    raise exception 'invalid_offering';
  end if;

  -- The existing function holds the account lock for the transaction and
  -- records each request ID. A failure rolls back the entire batch. Retrying
  -- the same IDs after a lost response returns without spending them again.
  foreach item_id in array request_ids loop
    perform stonino_private.spend_prayer_credit(
      item_id, offering_kind, prayer_type, prayer_index, note, novena_day
    );
  end loop;
end;
$$;

revoke all on function public.stonino_spend_prayer_credits(uuid[], text, text, integer, text, integer)
  from public, anon, authenticated;
grant execute on function public.stonino_spend_prayer_credits(uuid[], text, text, integer, text, integer)
  to authenticated;

commit;

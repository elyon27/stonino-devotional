-- Existing installations with prayer-packs.sql already applied.
create or replace function stonino_private.spend_prayer_credit(
  request_id uuid, offering_kind text, prayer_type text, prayer_index integer, note text, novena_day integer
) returns void language plpgsql security definer set search_path = '' as $$
declare
  owner_id uuid := auth.uid();
  now_at timestamptz := pg_catalog.now();
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

  if novena_day is not null and
     (offering_kind not in ('novena-candle', 'novena-flowers') or novena_day not between 0 and 8) then
    raise exception 'invalid_offering';
  end if;

  update public.stonino_prayer_wallets set balance = balance - 1
    where user_id = owner_id and balance > 0;
  if not found then raise exception 'prayer_pack_empty'; end if;

  offering := pg_catalog.jsonb_strip_nulls(pg_catalog.jsonb_build_object(
    'id', request_id, 'note', coalesce(note, ''), 'type', prayer_type,
    'prayerIndex', prayer_index, 'created_at', pg_catalog.to_char(now_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'), 'novena_day', novena_day, 'offering_kind', offering_kind
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

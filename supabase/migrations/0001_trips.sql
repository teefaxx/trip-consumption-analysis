-- Trip Consumption Analysis — cloud sync schema.
-- Run once in the Supabase SQL editor (Project → SQL Editor → New query).
-- Safe by default: row-level security means every signed-in user can only
-- see and change their own rows; anonymous (not signed-in) requests get nothing.

create table if not exists public.trips (
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  id         text        not null check (char_length(id) between 1 and 64),
  -- The full Trip object as the app stores it locally. NULL once deleted.
  data       jsonb,
  -- Soft delete ("tombstone") so a deletion on one device reaches the others.
  deleted    boolean     not null default false,
  start_t    bigint,
  updated_at timestamptz not null default now(),
  primary key (user_id, id),
  constraint trips_data_present check (deleted or data is not null),
  constraint trips_tombstone_empty check (not deleted or data is null)
);

create index if not exists trips_user_updated_idx on public.trips (user_id, updated_at);

-- ---------------------------------------------------------------------------
-- Row-level security: the only thing standing between users' location data.
-- ---------------------------------------------------------------------------
alter table public.trips enable row level security;

drop policy if exists "trips: read own" on public.trips;
create policy "trips: read own" on public.trips
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "trips: insert own" on public.trips;
create policy "trips: insert own" on public.trips
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "trips: update own" on public.trips;
create policy "trips: update own" on public.trips
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- No DELETE policy: the app soft-deletes; rows are removed for real only
-- when the account is deleted (ON DELETE CASCADE above).

revoke all on public.trips from anon;
revoke all on public.trips from authenticated;
grant select, insert, update on public.trips to authenticated;

-- ---------------------------------------------------------------------------
-- Server-side bookkeeping and abuse limits (sign-up is open to any GitHub
-- account, and the free tier has 500 MB for everyone together).
-- ---------------------------------------------------------------------------
create or replace function public.trips_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  used_bytes bigint;
  row_count  bigint;
begin
  -- The server clock decides updated_at; clients cannot back- or forward-date rows.
  new.updated_at := now();

  if new.data is not null and pg_column_size(new.data) > 5 * 1024 * 1024 then
    raise exception 'Trip is too large to sync (max 5 MB).' using errcode = 'P0001';
  end if;

  select count(*), coalesce(sum(pg_column_size(t.data)), 0)
    into row_count, used_bytes
    from public.trips t
   where t.user_id = new.user_id
     and t.id <> new.id;

  if row_count >= 20000 then
    raise exception 'Trip limit reached for this account.' using errcode = 'P0001';
  end if;
  if used_bytes + coalesce(pg_column_size(new.data), 0) > 50 * 1024 * 1024 then
    raise exception 'Storage limit reached for this account (50 MB).' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists trips_before_write on public.trips;
create trigger trips_before_write
  before insert or update on public.trips
  for each row execute function public.trips_before_write();

-- ---------------------------------------------------------------------------
-- "Delete my account": removes the auth user; trips go with it (cascade).
-- SECURITY DEFINER because users cannot touch auth.users themselves; it only
-- ever deletes the caller.
-- ---------------------------------------------------------------------------
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not signed in.' using errcode = '42501';
  end if;
  delete from public.trips where user_id = uid;
  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

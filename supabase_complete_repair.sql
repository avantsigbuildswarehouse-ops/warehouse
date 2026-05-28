-- Complete Supabase repair after schema/RLS hardening.
-- Run this whole file in Supabase SQL Editor.
--
-- What this fixes:
-- 1) Restores schema USAGE required by Supabase/PostgREST schema cache.
-- 2) Keeps anonymous users from reading/writing tables.
-- 3) Makes profile role lookup stable and non-recursive.
-- 4) Guarantees avantsigbuilds@gmail.com has a matching admin profile row.
-- 5) Reloads PostgREST schema cache.

begin;

create schema if not exists warehouse;
create schema if not exists asb_showrooms;

grant usage on schema public to anon, authenticated, service_role;
grant usage on schema warehouse to anon, authenticated, service_role;
grant usage on schema asb_showrooms to anon, authenticated, service_role;

revoke all on all tables in schema public from anon;
revoke all on all tables in schema warehouse from anon;
revoke all on all tables in schema asb_showrooms from anon;
revoke all on all sequences in schema public from anon;
revoke all on all sequences in schema warehouse from anon;
revoke all on all sequences in schema asb_showrooms from anon;

grant all on all tables in schema public to service_role;
grant all on all tables in schema warehouse to service_role;
grant all on all tables in schema asb_showrooms to service_role;
grant usage, select on all sequences in schema public to service_role;
grant usage, select on all sequences in schema warehouse to service_role;
grant usage, select on all sequences in schema asb_showrooms to service_role;

grant select on table public.profiles to authenticated;
grant select, insert, update, delete on table public.profiles to service_role;

-- Authenticated app users still need table privileges; RLS decides which rows/actions pass.
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select, insert, update, delete on all tables in schema warehouse to authenticated;
grant select, insert, update, delete on all tables in schema asb_showrooms to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant usage, select on all sequences in schema warehouse to authenticated;
grant usage, select on all sequences in schema asb_showrooms to authenticated;

create or replace function public.current_profile_role()
returns text
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select role
  from public.profiles
  where id = auth.uid()
  limit 1
$$;

create or replace function public.current_profile_code()
returns text
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select code
  from public.profiles
  where id = auth.uid()
  limit 1
$$;

revoke all on function public.current_profile_role() from public;
revoke all on function public.current_profile_code() from public;
grant execute on function public.current_profile_role() to authenticated, service_role;
grant execute on function public.current_profile_code() to authenticated, service_role;

alter table public.profiles enable row level security;

drop policy if exists profiles_select on public.profiles;
drop policy if exists profiles_insert on public.profiles;
drop policy if exists profiles_update on public.profiles;
drop policy if exists profiles_delete on public.profiles;
drop policy if exists profiles_service_all on public.profiles;
drop policy if exists profiles_self_select on public.profiles;
drop policy if exists profiles_self_insert on public.profiles;
drop policy if exists profiles_admin_all on public.profiles;

create policy profiles_service_all
on public.profiles
for all
to service_role
using (true)
with check (true);

create policy profiles_self_select
on public.profiles
for select
to authenticated
using (auth.uid() = id);

create policy profiles_self_insert
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

insert into public.profiles (id, email, role, code)
select id, email, 'admin', null
from auth.users
where lower(email) = 'avantsigbuilds@gmail.com'
on conflict (id) do update
set email = excluded.email,
    role = 'admin';

notify pgrst, 'reload schema';

commit;

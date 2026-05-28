-- Supabase PostgREST schema-cache + login repair.
-- Run this whole file in Supabase SQL Editor.
--
-- Why this exists:
-- A 503 on /rest/v1/profiles means PostgREST cannot build/query its schema
-- cache. That happens when exposed schemas/tables lose the grants PostgREST
-- expects, or when the previously exposed "ASB showrooms" schema disappears.
--
-- This keeps data protected by RLS, but restores the schema/table visibility
-- PostgREST needs to serve authenticated requests.

begin;

create schema if not exists warehouse;
create schema if not exists asb_showrooms;
create schema if not exists "ASB showrooms";

grant usage on schema public to anon, authenticated, service_role;
grant usage on schema warehouse to anon, authenticated, service_role;
grant usage on schema asb_showrooms to anon, authenticated, service_role;
grant usage on schema "ASB showrooms" to anon, authenticated, service_role;

-- PostgREST needs privileges to introspect exposed tables. RLS still decides
-- which rows are visible, so this does not by itself expose protected data.
grant select on all tables in schema public to anon, authenticated;
grant select on all tables in schema warehouse to anon, authenticated;
grant select on all tables in schema asb_showrooms to anon, authenticated;
grant select on all tables in schema "ASB showrooms" to anon, authenticated;

grant insert, update, delete on all tables in schema public to authenticated;
grant insert, update, delete on all tables in schema warehouse to authenticated;
grant insert, update, delete on all tables in schema asb_showrooms to authenticated;

grant all on all tables in schema public to service_role;
grant all on all tables in schema warehouse to service_role;
grant all on all tables in schema asb_showrooms to service_role;
grant all on all tables in schema "ASB showrooms" to service_role;

grant usage, select on all sequences in schema public to anon, authenticated, service_role;
grant usage, select on all sequences in schema warehouse to anon, authenticated, service_role;
grant usage, select on all sequences in schema asb_showrooms to anon, authenticated, service_role;
grant usage, select on all sequences in schema "ASB showrooms" to anon, authenticated, service_role;

-- Compatibility views for projects/Supabase API settings that still expose the
-- old schema name. If the old schema is no longer exposed this is harmless.
create or replace view "ASB showrooms".asb_showrooms as
select * from asb_showrooms.asb_showrooms;

create or replace view "ASB showrooms".dealers as
select * from asb_showrooms.dealers;

create or replace view "ASB showrooms".dealer_vehicle_inventory as
select * from asb_showrooms.dealer_vehicle_inventory;

create or replace view "ASB showrooms".dealer_spare_inventory as
select * from asb_showrooms.dealer_spare_inventory;

create or replace view "ASB showrooms".showroom_vehicle_inventory as
select * from asb_showrooms.showroom_vehicle_inventory;

create or replace view "ASB showrooms".showroom_spare_inventory as
select * from asb_showrooms.showroom_spare_inventory;

grant select on all tables in schema "ASB showrooms" to anon, authenticated, service_role;

-- Keep profile lookup simple and non-recursive.
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

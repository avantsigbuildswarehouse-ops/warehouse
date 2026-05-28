-- Fixed Supabase update migration for ASB Warehouse
-- Run this in Supabase SQL editor after taking a database backup.
-- It renames the legacy "ASB showrooms" schema, tightens grants/RLS,
-- adds missing relationships, and creates an audit table for admin deletes.

begin;

create extension if not exists "pgcrypto";

do $$
declare
  old_schema text := 'ASB showrooms';
  new_schema text := 'asb_showrooms';
  table_name text;
begin
  if exists (select 1 from pg_namespace where nspname = old_schema)
     and not exists (select 1 from pg_namespace where nspname = new_schema) then
    execute format('alter schema %I rename to %I', old_schema, new_schema);
  elsif exists (select 1 from pg_namespace where nspname = old_schema)
     and exists (select 1 from pg_namespace where nspname = new_schema) then
    for table_name in
      select c.relname
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = old_schema
        and c.relkind in ('r', 'p')
        and not exists (
          select 1
          from pg_class c2
          join pg_namespace n2 on n2.oid = c2.relnamespace
          where n2.nspname = new_schema
            and c2.relname = c.relname
            and c2.relkind in ('r', 'p')
        )
    loop
      execute format('alter table %I.%I set schema %I', old_schema, table_name, new_schema);
    end loop;
  end if;
end $$;

create schema if not exists asb_showrooms;

create or replace function public.current_profile_role()
returns text
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.current_profile_code()
returns text
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select code from public.profiles where id = auth.uid()
$$;

revoke all on function public.current_profile_role() from public;
revoke all on function public.current_profile_code() from public;
grant execute on function public.current_profile_role() to authenticated, service_role;
grant execute on function public.current_profile_code() to authenticated, service_role;

create table if not exists public.admin_delete_audit (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  admin_user_id uuid references auth.users(id) on delete set null,
  target_schema text not null,
  target_table text not null,
  target_key text not null,
  target_id text not null
);

alter table public.admin_delete_audit enable row level security;

drop policy if exists admin_delete_audit_service_all on public.admin_delete_audit;
drop policy if exists admin_delete_audit_admin_select on public.admin_delete_audit;

create policy admin_delete_audit_service_all
on public.admin_delete_audit
for all
to service_role
using (true)
with check (true);

create policy admin_delete_audit_admin_select
on public.admin_delete_audit
for select
to authenticated
using (public.current_profile_role() = 'admin');

-- Remove broad anonymous write/read surface.
revoke all on all tables in schema public from anon;
revoke all on all tables in schema warehouse from anon;
revoke all on all tables in schema asb_showrooms from anon;
revoke all on all sequences in schema public from anon;
revoke all on all sequences in schema warehouse from anon;
revoke all on all sequences in schema asb_showrooms from anon;
grant usage on schema public to anon, authenticated, service_role;
grant usage on schema warehouse to anon, authenticated, service_role;
grant usage on schema asb_showrooms to anon, authenticated, service_role;
grant all on all tables in schema public to service_role;
grant all on all tables in schema warehouse to service_role;
grant all on all tables in schema asb_showrooms to service_role;
grant usage, select on all sequences in schema public to service_role;
grant usage, select on all sequences in schema warehouse to service_role;
grant usage, select on all sequences in schema asb_showrooms to service_role;
grant select on table public.profiles to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select, insert, update, delete on all tables in schema warehouse to authenticated;
grant select, insert, update, delete on all tables in schema asb_showrooms to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant usage, select on all sequences in schema warehouse to authenticated;
grant usage, select on all sequences in schema asb_showrooms to authenticated;

-- Normalize profile constraints.
alter table public.profiles
  alter column role set default 'frontdesk',
  add column if not exists code text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_role_check') then
    alter table public.profiles
      add constraint profiles_role_check
      check (role in ('admin', 'frontdesk', 'sales', 'dealer-admin', 'dealer-finance', 'showroom-admin', 'showroom-finance'));
  end if;
end $$;

create unique index if not exists profiles_email_unique_idx
on public.profiles (lower(email))
where email is not null;

-- Missing relationship constraints. NOT VALID avoids failing on historical dirty data
-- while enforcing all future writes.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'dealer_vehicle_requests_dealer_code_fkey') then
    alter table public.dealer_vehicle_requests
      add constraint dealer_vehicle_requests_dealer_code_fkey
      foreign key (dealer_code) references asb_showrooms.dealers(dealer_code)
      on update cascade on delete restrict not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'dealer_spare_requests_dealer_code_fkey') then
    alter table public.dealer_spare_requests
      add constraint dealer_spare_requests_dealer_code_fkey
      foreign key (dealer_code) references asb_showrooms.dealers(dealer_code)
      on update cascade on delete restrict not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'showroom_vehicle_requests_showroom_code_fkey') then
    alter table public.showroom_vehicle_requests
      add constraint showroom_vehicle_requests_showroom_code_fkey
      foreign key (showroom_code) references asb_showrooms.asb_showrooms(showroom_code)
      on update cascade on delete restrict not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'showroom_spare_requests_showroom_code_fkey') then
    alter table public.showroom_spare_requests
      add constraint showroom_spare_requests_showroom_code_fkey
      foreign key (showroom_code) references asb_showrooms.asb_showrooms(showroom_code)
      on update cascade on delete restrict not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'sales_orders_customer_id_fkey') then
    alter table public.sales_orders
      add constraint sales_orders_customer_id_fkey
      foreign key (customer_id) references public."Customers"(id)
      on update cascade on delete set null not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'sales_orders_company_id_fkey') then
    alter table public.sales_orders
      add constraint sales_orders_company_id_fkey
      foreign key (company_id) references public."Companies"(id)
      on update cascade on delete set null not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'sales_orders_buyer_exactly_one_check') then
    alter table public.sales_orders
      add constraint sales_orders_buyer_exactly_one_check
      check (
        (buyer_type = 'customer' and customer_id is not null and company_id is null)
        or
        (buyer_type = 'company' and company_id is not null and customer_id is null)
      ) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'dealer_vehicle_inventory_dealer_code_fkey') then
    alter table asb_showrooms.dealer_vehicle_inventory
      add constraint dealer_vehicle_inventory_dealer_code_fkey
      foreign key (dealer_code) references asb_showrooms.dealers(dealer_code)
      on update cascade on delete restrict not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'dealer_spare_inventory_dealer_code_fkey') then
    alter table asb_showrooms.dealer_spare_inventory
      add constraint dealer_spare_inventory_dealer_code_fkey
      foreign key (dealer_code) references asb_showrooms.dealers(dealer_code)
      on update cascade on delete restrict not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'showroom_vehicle_inventory_showroom_code_fkey') then
    alter table asb_showrooms.showroom_vehicle_inventory
      add constraint showroom_vehicle_inventory_showroom_code_fkey
      foreign key (showroom_code) references asb_showrooms.asb_showrooms(showroom_code)
      on update cascade on delete restrict not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'showroom_spare_inventory_showroom_code_fkey') then
    alter table asb_showrooms.showroom_spare_inventory
      add constraint showroom_spare_inventory_showroom_code_fkey
      foreign key (showroom_code) references asb_showrooms.asb_showrooms(showroom_code)
      on update cascade on delete restrict not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'dealer_vehicle_inventory_sale_id_fkey') then
    alter table asb_showrooms.dealer_vehicle_inventory
      add constraint dealer_vehicle_inventory_sale_id_fkey
      foreign key (sale_id) references public.sales_orders(id)
      on update cascade on delete set null not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'dealer_spare_inventory_sale_id_fkey') then
    alter table asb_showrooms.dealer_spare_inventory
      add constraint dealer_spare_inventory_sale_id_fkey
      foreign key (sale_id) references public.sales_orders(id)
      on update cascade on delete set null not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'showroom_vehicle_inventory_sale_id_fkey') then
    alter table asb_showrooms.showroom_vehicle_inventory
      add constraint showroom_vehicle_inventory_sale_id_fkey
      foreign key (sale_id) references public.sales_orders(id)
      on update cascade on delete set null not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'showroom_spare_inventory_sale_id_fkey') then
    alter table asb_showrooms.showroom_spare_inventory
      add constraint showroom_spare_inventory_sale_id_fkey
      foreign key (sale_id) references public.sales_orders(id)
      on update cascade on delete set null not valid;
  end if;
end $$;

create index if not exists sales_orders_target_idx on public.sales_orders(target_type, target_code);
create index if not exists sales_orders_customer_idx on public.sales_orders(customer_id) where customer_id is not null;
create index if not exists sales_orders_company_idx on public.sales_orders(company_id) where company_id is not null;
create index if not exists profiles_role_code_idx on public.profiles(role, code);

-- Profiles RLS.
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

-- Replace permissive policies in asb_showrooms.
do $$
declare
  table_name text;
  policy_name text;
begin
  for table_name in
    select unnest(array[
      'asb_showrooms',
      'dealers',
      'dealer_vehicle_inventory',
      'dealer_spare_inventory',
      'showroom_vehicle_inventory',
      'showroom_spare_inventory'
    ])
  loop
    execute format('alter table asb_showrooms.%I enable row level security', table_name);
    for policy_name in
      select pol.polname
      from pg_policy pol
      join pg_class cls on cls.oid = pol.polrelid
      join pg_namespace ns on ns.oid = cls.relnamespace
      where ns.nspname = 'asb_showrooms'
        and cls.relname = table_name
    loop
      execute format('drop policy if exists %I on asb_showrooms.%I', policy_name, table_name);
    end loop;
    execute format(
      'create policy %I on asb_showrooms.%I for all to service_role using (true) with check (true)',
      table_name || '_service_all',
      table_name
    );
    execute format(
      'create policy %I on asb_showrooms.%I for all to authenticated using (public.current_profile_role() = ''admin'') with check (public.current_profile_role() = ''admin'')',
      table_name || '_admin_all',
      table_name
    );
  end loop;
end $$;

create policy dealer_vehicle_inventory_partner_select
on asb_showrooms.dealer_vehicle_inventory
for select to authenticated
using (dealer_code = public.current_profile_code());

create policy dealer_spare_inventory_partner_select
on asb_showrooms.dealer_spare_inventory
for select to authenticated
using (dealer_code = public.current_profile_code());

create policy showroom_vehicle_inventory_partner_select
on asb_showrooms.showroom_vehicle_inventory
for select to authenticated
using (showroom_code = public.current_profile_code());

create policy showroom_spare_inventory_partner_select
on asb_showrooms.showroom_spare_inventory
for select to authenticated
using (showroom_code = public.current_profile_code());

-- Replace permissive warehouse inventory/model policies.
do $$
declare
  table_name text;
  policy_name text;
begin
  for table_name in
    select unnest(array[
      'vehicle_inventory',
      'vehicle_spare_inventory',
      'vehicle_model_codes',
      'vehicle_spare_codes',
      'dealer_documents',
      'showroom_documents'
    ])
  loop
    execute format('alter table warehouse.%I enable row level security', table_name);
    for policy_name in
      select pol.polname
      from pg_policy pol
      join pg_class cls on cls.oid = pol.polrelid
      join pg_namespace ns on ns.oid = cls.relnamespace
      where ns.nspname = 'warehouse'
        and cls.relname = table_name
    loop
      execute format('drop policy if exists %I on warehouse.%I', policy_name, table_name);
    end loop;
    execute format(
      'create policy %I on warehouse.%I for all to service_role using (true) with check (true)',
      table_name || '_service_all',
      table_name
    );
    execute format(
      'create policy %I on warehouse.%I for all to authenticated using (public.current_profile_role() = ''admin'') with check (public.current_profile_role() = ''admin'')',
      table_name || '_admin_all',
      table_name
    );
  end loop;
end $$;

create policy dealer_view_own_documents
on warehouse.dealer_documents
for select to authenticated
using (dealer_code = public.current_profile_code());

create policy showroom_view_own_documents
on warehouse.showroom_documents
for select to authenticated
using (showroom_code = public.current_profile_code());

-- Public sales/customer/company policies.
do $$
declare
  table_name text;
  policy_name text;
begin
  for table_name in
    select unnest(array[
      'Companies',
      'Customers',
      'company_documents',
      'customer_documents',
      'sales_orders',
      'sales_order_items',
      'dealer_vehicle_requests',
      'dealer_spare_requests',
      'showroom_vehicle_requests',
      'showroom_spare_requests'
    ])
  loop
    execute format('alter table public.%I enable row level security', table_name);
    for policy_name in
      select pol.polname
      from pg_policy pol
      join pg_class cls on cls.oid = pol.polrelid
      join pg_namespace ns on ns.oid = cls.relnamespace
      where ns.nspname = 'public'
        and cls.relname = table_name
        and pol.polname not like 'profiles_%'
    loop
      execute format('drop policy if exists %I on public.%I', policy_name, table_name);
    end loop;
    execute format(
      'create policy %I on public.%I for all to service_role using (true) with check (true)',
      lower(table_name) || '_service_all',
      table_name
    );
    execute format(
      'create policy %I on public.%I for all to authenticated using (public.current_profile_role() in (''admin'', ''sales'')) with check (public.current_profile_role() in (''admin'', ''sales''))',
      lower(table_name) || '_staff_all',
      table_name
    );
  end loop;
end $$;

create policy dealer_vehicle_requests_own_select
on public.dealer_vehicle_requests
for select to authenticated
using (dealer_code = public.current_profile_code());

create policy dealer_spare_requests_own_select
on public.dealer_spare_requests
for select to authenticated
using (dealer_code = public.current_profile_code());

create policy showroom_vehicle_requests_own_select
on public.showroom_vehicle_requests
for select to authenticated
using (showroom_code = public.current_profile_code());

create policy showroom_spare_requests_own_select
on public.showroom_spare_requests
for select to authenticated
using (showroom_code = public.current_profile_code());

notify pgrst, 'reload schema';

commit;

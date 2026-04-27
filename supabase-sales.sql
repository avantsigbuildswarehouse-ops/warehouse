-- =========================================================
-- Sales schema (paste into Supabase SQL editor)
-- Supports selling from dealer/showroom inventories
-- =========================================================

-- 1) Sales order headers
CREATE TABLE IF NOT EXISTS public.sales_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),

  buyer_type text NOT NULL CHECK (buyer_type IN ('customer','company')),
  customer_id uuid NULL,
  company_id uuid NULL,

  target_type text NOT NULL CHECK (target_type IN ('dealer','showroom')),
  target_code text NOT NULL,

  base_price numeric NOT NULL DEFAULT 0,
  vat numeric NOT NULL DEFAULT 0,
  registration_fee numeric NOT NULL DEFAULT 0,
  discount numeric NOT NULL DEFAULT 0,
  advance_payment numeric NOT NULL DEFAULT 0,
  balance_due numeric NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'manual',
  total numeric NOT NULL DEFAULT 0
);

-- 2) Sales order line items (references inventory row id)
CREATE TABLE IF NOT EXISTS public.sales_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  sale_id uuid NOT NULL REFERENCES public.sales_orders(id) ON DELETE CASCADE,
  item_type text NOT NULL CHECK (item_type IN ('Bike','Spare')),
  inventory_id uuid NOT NULL
);

CREATE INDEX IF NOT EXISTS sales_order_items_sale_id_idx ON public.sales_order_items(sale_id);

-- Prevent selling same inventory row twice
CREATE UNIQUE INDEX IF NOT EXISTS sales_order_items_unique_inventory
  ON public.sales_order_items(item_type, inventory_id);

-- 3) Add sale tracking columns to inventory tables (schema has a space, so must be quoted)
-- Bikes
ALTER TABLE IF EXISTS "ASB showrooms".dealer_vehicle_inventory
  ADD COLUMN IF NOT EXISTS sold_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS sale_id uuid NULL,
  ADD COLUMN IF NOT EXISTS sold_customer_id uuid NULL,
  ADD COLUMN IF NOT EXISTS sold_company_id uuid NULL;

ALTER TABLE IF EXISTS "ASB showrooms".showroom_vehicle_inventory
  ADD COLUMN IF NOT EXISTS sold_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS sale_id uuid NULL,
  ADD COLUMN IF NOT EXISTS sold_customer_id uuid NULL,
  ADD COLUMN IF NOT EXISTS sold_company_id uuid NULL;

-- Spares
ALTER TABLE IF EXISTS "ASB showrooms".dealer_spare_inventory
  ADD COLUMN IF NOT EXISTS sold_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS sale_id uuid NULL,
  ADD COLUMN IF NOT EXISTS sold_customer_id uuid NULL,
  ADD COLUMN IF NOT EXISTS sold_company_id uuid NULL;

ALTER TABLE IF EXISTS "ASB showrooms".showroom_spare_inventory
  ADD COLUMN IF NOT EXISTS sold_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS sale_id uuid NULL,
  ADD COLUMN IF NOT EXISTS sold_customer_id uuid NULL,
  ADD COLUMN IF NOT EXISTS sold_company_id uuid NULL;

-- Helpful indexes for "available inventory" queries
CREATE INDEX IF NOT EXISTS dealer_vehicle_inventory_available_idx
  ON "ASB showrooms".dealer_vehicle_inventory(dealer_code, sold_at);
CREATE INDEX IF NOT EXISTS showroom_vehicle_inventory_available_idx
  ON "ASB showrooms".showroom_vehicle_inventory(showroom_code, sold_at);
CREATE INDEX IF NOT EXISTS dealer_spare_inventory_available_idx
  ON "ASB showrooms".dealer_spare_inventory(dealer_code, sold_at);
CREATE INDEX IF NOT EXISTS showroom_spare_inventory_available_idx
  ON "ASB showrooms".showroom_spare_inventory(showroom_code, sold_at);

-- Reload schema cache for PostgREST
NOTIFY pgrst, 'reload schema';


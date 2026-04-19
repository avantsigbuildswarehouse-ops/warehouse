-- Drop existing tables if they exist
DROP TABLE IF EXISTS warehouse.showroom_vehicle_inventory CASCADE;
DROP TABLE IF EXISTS warehouse.showroom_spare_inventory CASCADE;
DROP TABLE IF EXISTS warehouse.dealer_vehicle_inventory CASCADE;
DROP TABLE IF EXISTS warehouse.dealer_spare_inventory CASCADE;

-- Showroom Vehicle Inventory Table
CREATE TABLE warehouse.showroom_vehicle_inventory (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  showroom_code text NOT NULL,
  model_code text NOT NULL,
  engine_number text NOT NULL UNIQUE,
  chassis_number text NOT NULL UNIQUE,
  color text,
  yom text,
  version text,
  price numeric,
  issued_at timestamp with time zone DEFAULT now()
);

-- Showroom Spare Inventory Table
CREATE TABLE warehouse.showroom_spare_inventory (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  showroom_code text NOT NULL,
  model_code text NOT NULL,
  spare_code text NOT NULL,
  serial_number text NOT NULL UNIQUE,
  issued_at timestamp with time zone DEFAULT now()
);

-- Dealer Vehicle Inventory Table
CREATE TABLE warehouse.dealer_vehicle_inventory (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  dealer_code text NOT NULL,
  model_code text NOT NULL,
  engine_number text NOT NULL UNIQUE,
  chassis_number text NOT NULL UNIQUE,
  color text,
  yom text,
  version text,
  price numeric,
  issued_at timestamp with time zone DEFAULT now()
);

-- Dealer Spare Inventory Table
CREATE TABLE warehouse.dealer_spare_inventory (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  dealer_code text NOT NULL,
  model_code text NOT NULL,
  spare_code text NOT NULL,
  serial_number text NOT NULL UNIQUE,
  issued_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE warehouse.showroom_vehicle_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouse.showroom_spare_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouse.dealer_vehicle_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouse.dealer_spare_inventory ENABLE ROW LEVEL SECURITY;

-- Create Policies for Authenticated Users
-- We will allow Select, Insert, Update, Delete for authenticated users for easier admin management.
-- You can tighten these rules later by checking the auth.uid() or profiles.role

CREATE POLICY "Allow All Actions for Authenticated - Showroom Bikes" 
ON warehouse.showroom_vehicle_inventory FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow All Actions for Authenticated - Showroom Spares" 
ON warehouse.showroom_spare_inventory FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow All Actions for Authenticated - Dealer Bikes" 
ON warehouse.dealer_vehicle_inventory FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow All Actions for Authenticated - Dealer Spares" 
ON warehouse.dealer_spare_inventory FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Ensure service_role has access to these as well (supabaseAdmin client)
-- Using service_role bypasses RLS, but stating the grants is best practice.
GRANT ALL ON TABLE warehouse.showroom_vehicle_inventory TO authenticated, service_role;
GRANT ALL ON TABLE warehouse.showroom_spare_inventory TO authenticated, service_role;
GRANT ALL ON TABLE warehouse.dealer_vehicle_inventory TO authenticated, service_role;
GRANT ALL ON TABLE warehouse.dealer_spare_inventory TO authenticated, service_role;

-- Force PostgREST to reload the schema cache so the tables are instantly available
NOTIFY pgrst, 'reload schema';

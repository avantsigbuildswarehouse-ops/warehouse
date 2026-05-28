


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "asb_showrooms";


ALTER SCHEMA "asb_showrooms" OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "asb_showrooms"."asb_showrooms" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "showroom_code" character varying(20) NOT NULL,
    "city" character varying(50),
    "state" character varying(50),
    "address" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "asb_showrooms"."asb_showrooms" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "asb_showrooms"."dealer_spare_inventory" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "dealer_code" "text" NOT NULL,
    "model_code" "text" NOT NULL,
    "spare_code" "text" NOT NULL,
    "serial_number" "text" NOT NULL,
    "issued_at" timestamp with time zone DEFAULT "now"(),
    "price" "text" NOT NULL,
    "sold_at" timestamp with time zone,
    "sale_id" "uuid",
    "sold_customer_id" "uuid",
    "sold_company_id" "uuid"
);


ALTER TABLE "asb_showrooms"."dealer_spare_inventory" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "asb_showrooms"."dealer_vehicle_inventory" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "dealer_code" "text" NOT NULL,
    "model_code" "text" NOT NULL,
    "engine_number" "text" NOT NULL,
    "chassis_number" "text" NOT NULL,
    "color" "text",
    "yom" "text",
    "version" "text",
    "price" numeric,
    "issued_at" timestamp with time zone DEFAULT "now"(),
    "sold_at" timestamp with time zone,
    "sale_id" "uuid",
    "sold_customer_id" "uuid",
    "sold_company_id" "uuid"
);


ALTER TABLE "asb_showrooms"."dealer_vehicle_inventory" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "asb_showrooms"."dealers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "dealer_code" character varying(20) NOT NULL,
    "business_name" character varying(100) NOT NULL,
    "owner_name" character varying(100),
    "city" character varying(50),
    "state" character varying(50),
    "address" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "asb_showrooms"."dealers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "asb_showrooms"."showroom_spare_inventory" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "showroom_code" "text" NOT NULL,
    "model_code" "text" NOT NULL,
    "spare_code" "text" NOT NULL,
    "serial_number" "text" NOT NULL,
    "issued_at" timestamp with time zone DEFAULT "now"(),
    "price" "text" NOT NULL,
    "sold_at" timestamp with time zone,
    "sale_id" "uuid",
    "sold_customer_id" "uuid",
    "sold_company_id" "uuid"
);


ALTER TABLE "asb_showrooms"."showroom_spare_inventory" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "asb_showrooms"."showroom_vehicle_inventory" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "showroom_code" "text" NOT NULL,
    "model_code" "text" NOT NULL,
    "engine_number" "text" NOT NULL,
    "chassis_number" "text" NOT NULL,
    "color" "text",
    "yom" "text",
    "version" "text",
    "price" numeric,
    "issued_at" timestamp with time zone DEFAULT "now"(),
    "sold_at" timestamp with time zone,
    "sale_id" "uuid",
    "sold_customer_id" "uuid",
    "sold_company_id" "uuid"
);


ALTER TABLE "asb_showrooms"."showroom_vehicle_inventory" OWNER TO "postgres";


ALTER TABLE ONLY "asb_showrooms"."asb_showrooms"
    ADD CONSTRAINT "asb_showrooms_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "asb_showrooms"."asb_showrooms"
    ADD CONSTRAINT "asb_showrooms_showroom_code_key" UNIQUE ("showroom_code");



ALTER TABLE ONLY "asb_showrooms"."dealer_spare_inventory"
    ADD CONSTRAINT "dealer_spare_inventory_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "asb_showrooms"."dealer_spare_inventory"
    ADD CONSTRAINT "dealer_spare_inventory_serial_number_key" UNIQUE ("serial_number");



ALTER TABLE ONLY "asb_showrooms"."dealer_vehicle_inventory"
    ADD CONSTRAINT "dealer_vehicle_inventory_chassis_number_key" UNIQUE ("chassis_number");



ALTER TABLE ONLY "asb_showrooms"."dealer_vehicle_inventory"
    ADD CONSTRAINT "dealer_vehicle_inventory_engine_number_key" UNIQUE ("engine_number");



ALTER TABLE ONLY "asb_showrooms"."dealer_vehicle_inventory"
    ADD CONSTRAINT "dealer_vehicle_inventory_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "asb_showrooms"."dealers"
    ADD CONSTRAINT "dealers_dealer_code_key" UNIQUE ("dealer_code");



ALTER TABLE ONLY "asb_showrooms"."dealers"
    ADD CONSTRAINT "dealers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "asb_showrooms"."showroom_spare_inventory"
    ADD CONSTRAINT "showroom_spare_inventory_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "asb_showrooms"."showroom_spare_inventory"
    ADD CONSTRAINT "showroom_spare_inventory_serial_number_key" UNIQUE ("serial_number");



ALTER TABLE ONLY "asb_showrooms"."showroom_vehicle_inventory"
    ADD CONSTRAINT "showroom_vehicle_inventory_chassis_number_key" UNIQUE ("chassis_number");



ALTER TABLE ONLY "asb_showrooms"."showroom_vehicle_inventory"
    ADD CONSTRAINT "showroom_vehicle_inventory_engine_number_key" UNIQUE ("engine_number");



ALTER TABLE ONLY "asb_showrooms"."showroom_vehicle_inventory"
    ADD CONSTRAINT "showroom_vehicle_inventory_pkey" PRIMARY KEY ("id");



CREATE INDEX "dealer_spare_inventory_available_idx" ON "asb_showrooms"."dealer_spare_inventory" USING "btree" ("dealer_code", "sold_at");



CREATE INDEX "dealer_vehicle_inventory_available_idx" ON "asb_showrooms"."dealer_vehicle_inventory" USING "btree" ("dealer_code", "sold_at");



CREATE INDEX "showroom_spare_inventory_available_idx" ON "asb_showrooms"."showroom_spare_inventory" USING "btree" ("showroom_code", "sold_at");



CREATE INDEX "showroom_vehicle_inventory_available_idx" ON "asb_showrooms"."showroom_vehicle_inventory" USING "btree" ("showroom_code", "sold_at");



ALTER TABLE ONLY "asb_showrooms"."dealer_spare_inventory"
    ADD CONSTRAINT "dealer_spare_inventory_sold_company_id_fkey" FOREIGN KEY ("sold_company_id") REFERENCES "public"."Companies"("id");



ALTER TABLE ONLY "asb_showrooms"."dealer_spare_inventory"
    ADD CONSTRAINT "dealer_spare_inventory_sold_customer_id_fkey" FOREIGN KEY ("sold_customer_id") REFERENCES "public"."Customers"("id");



ALTER TABLE ONLY "asb_showrooms"."dealer_vehicle_inventory"
    ADD CONSTRAINT "dealer_vehicle_inventory_sold_company_id_fkey" FOREIGN KEY ("sold_company_id") REFERENCES "public"."Companies"("id");



ALTER TABLE ONLY "asb_showrooms"."dealer_vehicle_inventory"
    ADD CONSTRAINT "dealer_vehicle_inventory_sold_customer_id_fkey" FOREIGN KEY ("sold_customer_id") REFERENCES "public"."Customers"("id");



ALTER TABLE ONLY "asb_showrooms"."showroom_spare_inventory"
    ADD CONSTRAINT "showroom_spare_inventory_sold_company_id_fkey" FOREIGN KEY ("sold_company_id") REFERENCES "public"."Companies"("id");



ALTER TABLE ONLY "asb_showrooms"."showroom_spare_inventory"
    ADD CONSTRAINT "showroom_spare_inventory_sold_customer_id_fkey" FOREIGN KEY ("sold_customer_id") REFERENCES "public"."Customers"("id");



ALTER TABLE ONLY "asb_showrooms"."showroom_vehicle_inventory"
    ADD CONSTRAINT "showroom_vehicle_inventory_sold_company_id_fkey" FOREIGN KEY ("sold_company_id") REFERENCES "public"."Companies"("id");



ALTER TABLE ONLY "asb_showrooms"."showroom_vehicle_inventory"
    ADD CONSTRAINT "showroom_vehicle_inventory_sold_customer_id_fkey" FOREIGN KEY ("sold_customer_id") REFERENCES "public"."Customers"("id");



ALTER TABLE "asb_showrooms"."asb_showrooms" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "asb_showrooms_delete" ON "asb_showrooms"."asb_showrooms" FOR DELETE TO "authenticated", "anon", "service_role" USING ((("auth"."role"() = 'service_role'::"text") OR ("auth"."role"() = 'authenticated'::"text")));



CREATE POLICY "asb_showrooms_insert" ON "asb_showrooms"."asb_showrooms" FOR INSERT TO "authenticated", "anon", "service_role" WITH CHECK ((("auth"."role"() = 'service_role'::"text") OR ("auth"."role"() = 'authenticated'::"text")));



CREATE POLICY "asb_showrooms_select" ON "asb_showrooms"."asb_showrooms" FOR SELECT TO "authenticated", "anon", "service_role" USING (true);



CREATE POLICY "asb_showrooms_update" ON "asb_showrooms"."asb_showrooms" FOR UPDATE TO "authenticated", "anon", "service_role" USING ((("auth"."role"() = 'service_role'::"text") OR ("auth"."role"() = 'authenticated'::"text"))) WITH CHECK ((("auth"."role"() = 'service_role'::"text") OR ("auth"."role"() = 'authenticated'::"text")));



ALTER TABLE "asb_showrooms"."dealer_spare_inventory" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "dealer_spare_inventory_delete" ON "asb_showrooms"."dealer_spare_inventory" FOR DELETE TO "authenticated", "anon", "service_role" USING ((("auth"."role"() = 'service_role'::"text") OR ("auth"."role"() = 'authenticated'::"text")));



CREATE POLICY "dealer_spare_inventory_insert" ON "asb_showrooms"."dealer_spare_inventory" FOR INSERT TO "authenticated", "anon", "service_role" WITH CHECK ((("auth"."role"() = 'service_role'::"text") OR ("auth"."role"() = 'authenticated'::"text")));



CREATE POLICY "dealer_spare_inventory_select" ON "asb_showrooms"."dealer_spare_inventory" FOR SELECT TO "authenticated", "anon", "service_role" USING (true);



CREATE POLICY "dealer_spare_inventory_update" ON "asb_showrooms"."dealer_spare_inventory" FOR UPDATE TO "authenticated", "anon", "service_role" USING ((("auth"."role"() = 'service_role'::"text") OR ("auth"."role"() = 'authenticated'::"text"))) WITH CHECK ((("auth"."role"() = 'service_role'::"text") OR ("auth"."role"() = 'authenticated'::"text")));



ALTER TABLE "asb_showrooms"."dealer_vehicle_inventory" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "dealer_vehicle_inventory_delete" ON "asb_showrooms"."dealer_vehicle_inventory" FOR DELETE TO "authenticated", "anon", "service_role" USING ((("auth"."role"() = 'service_role'::"text") OR ("auth"."role"() = 'authenticated'::"text")));



CREATE POLICY "dealer_vehicle_inventory_insert" ON "asb_showrooms"."dealer_vehicle_inventory" FOR INSERT TO "authenticated", "anon", "service_role" WITH CHECK ((("auth"."role"() = 'service_role'::"text") OR ("auth"."role"() = 'authenticated'::"text")));



CREATE POLICY "dealer_vehicle_inventory_select" ON "asb_showrooms"."dealer_vehicle_inventory" FOR SELECT TO "authenticated", "anon", "service_role" USING (true);



CREATE POLICY "dealer_vehicle_inventory_update" ON "asb_showrooms"."dealer_vehicle_inventory" FOR UPDATE TO "authenticated", "anon", "service_role" USING ((("auth"."role"() = 'service_role'::"text") OR ("auth"."role"() = 'authenticated'::"text"))) WITH CHECK ((("auth"."role"() = 'service_role'::"text") OR ("auth"."role"() = 'authenticated'::"text")));



ALTER TABLE "asb_showrooms"."dealers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "dealers_delete" ON "asb_showrooms"."dealers" FOR DELETE TO "authenticated", "anon", "service_role" USING ((("auth"."role"() = 'service_role'::"text") OR ("auth"."role"() = 'authenticated'::"text")));



CREATE POLICY "dealers_insert" ON "asb_showrooms"."dealers" FOR INSERT TO "authenticated", "anon", "service_role" WITH CHECK ((("auth"."role"() = 'service_role'::"text") OR ("auth"."role"() = 'authenticated'::"text")));



CREATE POLICY "dealers_select" ON "asb_showrooms"."dealers" FOR SELECT TO "authenticated", "anon", "service_role" USING (true);



CREATE POLICY "dealers_update" ON "asb_showrooms"."dealers" FOR UPDATE TO "authenticated", "anon", "service_role" USING ((("auth"."role"() = 'service_role'::"text") OR ("auth"."role"() = 'authenticated'::"text"))) WITH CHECK ((("auth"."role"() = 'service_role'::"text") OR ("auth"."role"() = 'authenticated'::"text")));



ALTER TABLE "asb_showrooms"."showroom_spare_inventory" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "showroom_spare_inventory_delete" ON "asb_showrooms"."showroom_spare_inventory" FOR DELETE TO "authenticated", "anon", "service_role" USING ((("auth"."role"() = 'service_role'::"text") OR ("auth"."role"() = 'authenticated'::"text")));



CREATE POLICY "showroom_spare_inventory_insert" ON "asb_showrooms"."showroom_spare_inventory" FOR INSERT TO "authenticated", "anon", "service_role" WITH CHECK ((("auth"."role"() = 'service_role'::"text") OR ("auth"."role"() = 'authenticated'::"text")));



CREATE POLICY "showroom_spare_inventory_select" ON "asb_showrooms"."showroom_spare_inventory" FOR SELECT TO "authenticated", "anon", "service_role" USING (true);



CREATE POLICY "showroom_spare_inventory_update" ON "asb_showrooms"."showroom_spare_inventory" FOR UPDATE TO "authenticated", "anon", "service_role" USING ((("auth"."role"() = 'service_role'::"text") OR ("auth"."role"() = 'authenticated'::"text"))) WITH CHECK ((("auth"."role"() = 'service_role'::"text") OR ("auth"."role"() = 'authenticated'::"text")));



ALTER TABLE "asb_showrooms"."showroom_vehicle_inventory" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "showroom_vehicle_inventory_delete" ON "asb_showrooms"."showroom_vehicle_inventory" FOR DELETE TO "authenticated", "anon", "service_role" USING ((("auth"."role"() = 'service_role'::"text") OR ("auth"."role"() = 'authenticated'::"text")));



CREATE POLICY "showroom_vehicle_inventory_insert" ON "asb_showrooms"."showroom_vehicle_inventory" FOR INSERT TO "authenticated", "anon", "service_role" WITH CHECK ((("auth"."role"() = 'service_role'::"text") OR ("auth"."role"() = 'authenticated'::"text")));



CREATE POLICY "showroom_vehicle_inventory_select" ON "asb_showrooms"."showroom_vehicle_inventory" FOR SELECT TO "authenticated", "anon", "service_role" USING (true);



CREATE POLICY "showroom_vehicle_inventory_update" ON "asb_showrooms"."showroom_vehicle_inventory" FOR UPDATE TO "authenticated", "anon", "service_role" USING ((("auth"."role"() = 'service_role'::"text") OR ("auth"."role"() = 'authenticated'::"text"))) WITH CHECK ((("auth"."role"() = 'service_role'::"text") OR ("auth"."role"() = 'authenticated'::"text")));



GRANT USAGE ON SCHEMA "asb_showrooms" TO "anon";
GRANT USAGE ON SCHEMA "asb_showrooms" TO "authenticated";
GRANT USAGE ON SCHEMA "asb_showrooms" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "asb_showrooms"."asb_showrooms" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "asb_showrooms"."asb_showrooms" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "asb_showrooms"."asb_showrooms" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "asb_showrooms"."dealer_spare_inventory" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "asb_showrooms"."dealer_spare_inventory" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "asb_showrooms"."dealer_spare_inventory" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "asb_showrooms"."dealer_vehicle_inventory" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "asb_showrooms"."dealer_vehicle_inventory" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "asb_showrooms"."dealer_vehicle_inventory" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "asb_showrooms"."dealers" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "asb_showrooms"."dealers" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "asb_showrooms"."dealers" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "asb_showrooms"."showroom_spare_inventory" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "asb_showrooms"."showroom_spare_inventory" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "asb_showrooms"."showroom_spare_inventory" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "asb_showrooms"."showroom_vehicle_inventory" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "asb_showrooms"."showroom_vehicle_inventory" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "asb_showrooms"."showroom_vehicle_inventory" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "asb_showrooms" GRANT SELECT,INSERT,DELETE,UPDATE ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "asb_showrooms" GRANT SELECT,INSERT,DELETE,UPDATE ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "asb_showrooms" GRANT SELECT,INSERT,DELETE,UPDATE ON TABLES TO "service_role";





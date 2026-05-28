


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


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."get_company_document_count"("p_company_id" "uuid") RETURNS TABLE("document_type" character varying, "count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT cd.document_type, COUNT(*) as count
  FROM public.company_documents cd
  WHERE cd.company_id = p_company_id
  GROUP BY cd.document_type;
END;
$$;


ALTER FUNCTION "public"."get_company_document_count"("p_company_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_customer_document_count"("p_customer_id" "uuid") RETURNS TABLE("document_type" character varying, "count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT cd.document_type, COUNT(*) as count
  FROM public.customer_documents cd
  WHERE cd.customer_id = p_customer_id
  GROUP BY cd.document_type;
END;
$$;


ALTER FUNCTION "public"."get_customer_document_count"("p_customer_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_request_totals"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.request_type = 'dealer' THEN
      UPDATE "public".dealer_requests
      SET 
        items_count = (
          SELECT COUNT(*) 
          FROM "public".request_items 
          WHERE reference_no = NEW.reference_no
        ),
        total_value = (
          SELECT COALESCE(SUM(price), 0) 
          FROM "public".request_items 
          WHERE reference_no = NEW.reference_no
        )
      WHERE reference_no = NEW.reference_no;
    ELSIF NEW.request_type = 'showroom' THEN
      UPDATE "public".showroom_requests
      SET 
        items_count = (
          SELECT COUNT(*) 
          FROM "public".request_items 
          WHERE reference_no = NEW.reference_no
        ),
        total_value = (
          SELECT COALESCE(SUM(price), 0) 
          FROM "public".request_items 
          WHERE reference_no = NEW.reference_no
        )
      WHERE reference_no = NEW.reference_no;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.request_type = 'dealer' THEN
      UPDATE "public".dealer_requests
      SET 
        items_count = (
          SELECT COUNT(*) 
          FROM "public".request_items 
          WHERE reference_no = OLD.reference_no
        ),
        total_value = (
          SELECT COALESCE(SUM(price), 0) 
          FROM "public".request_items 
          WHERE reference_no = OLD.reference_no
        )
      WHERE reference_no = OLD.reference_no;
    ELSIF OLD.request_type = 'showroom' THEN
      UPDATE "public".showroom_requests
      SET 
        items_count = (
          SELECT COUNT(*) 
          FROM "public".request_items 
          WHERE reference_no = OLD.reference_no
        ),
        total_value = (
          SELECT COALESCE(SUM(price), 0) 
          FROM "public".request_items 
          WHERE reference_no = OLD.reference_no
        )
      WHERE reference_no = OLD.reference_no;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_request_totals"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."Companies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "company_name" "text" NOT NULL,
    "company_email" "text" NOT NULL,
    "company_contact" "text",
    "address" "text",
    "BR_no" "text",
    "VAT_no" "text"
);


ALTER TABLE "public"."Companies" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."Company" WITH ("security_invoker"='on') AS
 SELECT "id",
    "created_at",
    "company_name",
    "company_email",
    "company_contact",
    "address",
    "BR_no",
    "VAT_no"
   FROM "public"."Companies";


ALTER VIEW "public"."Company" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."Customers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "first_name" "text" NOT NULL,
    "last_name" "text" NOT NULL,
    "phone_number" "text" NOT NULL,
    "address" "text",
    "nic" "text"
);


ALTER TABLE "public"."Customers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."company_documents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "document_type" character varying(50) NOT NULL,
    "document_number" character varying(255) NOT NULL,
    "document_data" "jsonb" NOT NULL,
    "generated_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "company_documents_document_type_check" CHECK ((("document_type")::"text" = ANY ((ARRAY['quotation'::character varying, 'invoice'::character varying, 'receipt'::character varying, 'delivery_note'::character varying])::"text"[])))
);


ALTER TABLE "public"."company_documents" OWNER TO "postgres";


COMMENT ON TABLE "public"."company_documents" IS 'Stores metadata for documents generated for companies (quotations, invoices, receipts, delivery notes)';



COMMENT ON COLUMN "public"."company_documents"."document_type" IS 'Type of document: quotation, invoice, receipt, delivery_note';



COMMENT ON COLUMN "public"."company_documents"."document_number" IS 'Unique document number for reference';



COMMENT ON COLUMN "public"."company_documents"."document_data" IS 'JSON data containing all information needed to regenerate the document';



CREATE TABLE IF NOT EXISTS "public"."customer_documents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "document_type" character varying(50) NOT NULL,
    "document_number" character varying(255) NOT NULL,
    "document_data" "jsonb" NOT NULL,
    "generated_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "customer_documents_document_type_check" CHECK ((("document_type")::"text" = ANY ((ARRAY['quotation'::character varying, 'invoice'::character varying, 'receipt'::character varying, 'delivery_note'::character varying])::"text"[])))
);


ALTER TABLE "public"."customer_documents" OWNER TO "postgres";


COMMENT ON TABLE "public"."customer_documents" IS 'Stores metadata for documents generated for customers (quotations, invoices, receipts, delivery notes)';



COMMENT ON COLUMN "public"."customer_documents"."document_type" IS 'Type of document: quotation, invoice, receipt, delivery_note';



COMMENT ON COLUMN "public"."customer_documents"."document_number" IS 'Unique document number for reference';



COMMENT ON COLUMN "public"."customer_documents"."document_data" IS 'JSON data containing all information needed to regenerate the document';



CREATE TABLE IF NOT EXISTS "public"."dealer_spare_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "reference_no" character varying(50) NOT NULL,
    "dealer_code" character varying(50) NOT NULL,
    "model_code" character varying(50) NOT NULL,
    "spare_code" character varying(50) NOT NULL,
    "spare_name" character varying(100),
    "serial_number" character varying(100) NOT NULL,
    "price" numeric(12,2) DEFAULT 0.00 NOT NULL,
    "status" character varying(20) DEFAULT 'PENDING'::character varying NOT NULL,
    "remarks" "text",
    "requested_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "approved_at" timestamp with time zone,
    "issued_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "dealer_spare_requests_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['PENDING'::character varying, 'APPROVED'::character varying, 'REJECTED'::character varying, 'ISSUED'::character varying, 'CANCELLED'::character varying])::"text"[])))
);


ALTER TABLE "public"."dealer_spare_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."dealer_vehicle_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "reference_no" character varying(50) NOT NULL,
    "dealer_code" character varying(50) NOT NULL,
    "model_code" character varying(50) NOT NULL,
    "engine_number" character varying(100) NOT NULL,
    "chassis_number" character varying(100) NOT NULL,
    "color" character varying(50),
    "yom" character varying(10),
    "version" character varying(50),
    "price" numeric(12,2) DEFAULT 0.00 NOT NULL,
    "status" character varying(20) DEFAULT 'PENDING'::character varying NOT NULL,
    "remarks" "text",
    "requested_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "approved_at" timestamp with time zone,
    "issued_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "dealer_vehicle_requests_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['PENDING'::character varying, 'APPROVED'::character varying, 'REJECTED'::character varying, 'ISSUED'::character varying, 'CANCELLED'::character varying])::"text"[])))
);


ALTER TABLE "public"."dealer_vehicle_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text",
    "role" "text" DEFAULT 'frontdesk'::"text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "code" "text"
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sales_order_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "sale_id" "uuid" NOT NULL,
    "item_type" "text" NOT NULL,
    "inventory_id" "uuid" NOT NULL,
    CONSTRAINT "sales_order_items_item_type_check" CHECK (("item_type" = ANY (ARRAY['Bike'::"text", 'Spare'::"text"])))
);


ALTER TABLE "public"."sales_order_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sales_orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "buyer_type" "text" NOT NULL,
    "customer_id" "uuid",
    "company_id" "uuid",
    "target_type" "text" NOT NULL,
    "target_code" "text" NOT NULL,
    "base_price" numeric DEFAULT 0 NOT NULL,
    "registration_fee" numeric DEFAULT 0 NOT NULL,
    "discount" numeric DEFAULT 0 NOT NULL,
    "advance_payment" numeric DEFAULT 0 NOT NULL,
    "balance_due" numeric DEFAULT 0 NOT NULL,
    "payment_method" "text" DEFAULT 'manual'::"text" NOT NULL,
    "total" numeric DEFAULT 0 NOT NULL,
    CONSTRAINT "sales_orders_buyer_type_check" CHECK (("buyer_type" = ANY (ARRAY['customer'::"text", 'company'::"text"]))),
    CONSTRAINT "sales_orders_target_type_check" CHECK (("target_type" = ANY (ARRAY['dealer'::"text", 'showroom'::"text"])))
);


ALTER TABLE "public"."sales_orders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."showroom_spare_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "reference_no" character varying(50) NOT NULL,
    "showroom_code" character varying(50) NOT NULL,
    "model_code" character varying(50) NOT NULL,
    "spare_code" character varying(50) NOT NULL,
    "spare_name" character varying(100),
    "serial_number" character varying(100) NOT NULL,
    "price" numeric(12,2) DEFAULT 0.00 NOT NULL,
    "status" character varying(20) DEFAULT 'PENDING'::character varying NOT NULL,
    "remarks" "text",
    "requested_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "approved_at" timestamp with time zone,
    "issued_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "showroom_spare_requests_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['PENDING'::character varying, 'APPROVED'::character varying, 'REJECTED'::character varying, 'ISSUED'::character varying, 'CANCELLED'::character varying])::"text"[])))
);


ALTER TABLE "public"."showroom_spare_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."showroom_vehicle_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "reference_no" character varying(50) NOT NULL,
    "showroom_code" character varying(50) NOT NULL,
    "model_code" character varying(50) NOT NULL,
    "engine_number" character varying(100) NOT NULL,
    "chassis_number" character varying(100) NOT NULL,
    "color" character varying(50),
    "yom" character varying(10),
    "version" character varying(50),
    "price" numeric(12,2) DEFAULT 0.00 NOT NULL,
    "status" character varying(20) DEFAULT 'PENDING'::character varying NOT NULL,
    "remarks" "text",
    "requested_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "approved_at" timestamp with time zone,
    "issued_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "showroom_vehicle_requests_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['PENDING'::character varying, 'APPROVED'::character varying, 'REJECTED'::character varying, 'ISSUED'::character varying, 'CANCELLED'::character varying])::"text"[])))
);


ALTER TABLE "public"."showroom_vehicle_requests" OWNER TO "postgres";


ALTER TABLE ONLY "public"."Companies"
    ADD CONSTRAINT "Companies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."Customers"
    ADD CONSTRAINT "Customers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."Companies"
    ADD CONSTRAINT "companies_email_unique" UNIQUE ("company_email");



ALTER TABLE ONLY "public"."company_documents"
    ADD CONSTRAINT "company_documents_document_number_key" UNIQUE ("document_number");



ALTER TABLE ONLY "public"."company_documents"
    ADD CONSTRAINT "company_documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customer_documents"
    ADD CONSTRAINT "customer_documents_document_number_key" UNIQUE ("document_number");



ALTER TABLE ONLY "public"."customer_documents"
    ADD CONSTRAINT "customer_documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."Customers"
    ADD CONSTRAINT "customers_phone_unique" UNIQUE ("phone_number");



ALTER TABLE ONLY "public"."dealer_spare_requests"
    ADD CONSTRAINT "dealer_spare_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dealer_spare_requests"
    ADD CONSTRAINT "dealer_spare_requests_reference_no_key" UNIQUE ("reference_no");



ALTER TABLE ONLY "public"."dealer_vehicle_requests"
    ADD CONSTRAINT "dealer_vehicle_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dealer_vehicle_requests"
    ADD CONSTRAINT "dealer_vehicle_requests_reference_no_key" UNIQUE ("reference_no");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sales_order_items"
    ADD CONSTRAINT "sales_order_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sales_orders"
    ADD CONSTRAINT "sales_orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."showroom_spare_requests"
    ADD CONSTRAINT "showroom_spare_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."showroom_spare_requests"
    ADD CONSTRAINT "showroom_spare_requests_reference_no_key" UNIQUE ("reference_no");



ALTER TABLE ONLY "public"."showroom_vehicle_requests"
    ADD CONSTRAINT "showroom_vehicle_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."showroom_vehicle_requests"
    ADD CONSTRAINT "showroom_vehicle_requests_reference_no_key" UNIQUE ("reference_no");



CREATE INDEX "companies_email_idx" ON "public"."Companies" USING "btree" ("company_email");



CREATE INDEX "customers_phone_idx" ON "public"."Customers" USING "btree" ("phone_number");



CREATE INDEX "idx_company_documents_company_id" ON "public"."company_documents" USING "btree" ("company_id");



CREATE INDEX "idx_company_documents_company_type" ON "public"."company_documents" USING "btree" ("company_id", "document_type");



CREATE INDEX "idx_company_documents_document_number" ON "public"."company_documents" USING "btree" ("document_number");



CREATE INDEX "idx_company_documents_document_type" ON "public"."company_documents" USING "btree" ("document_type");



CREATE INDEX "idx_company_documents_generated_at" ON "public"."company_documents" USING "btree" ("generated_at");



CREATE INDEX "idx_customer_documents_customer_id" ON "public"."customer_documents" USING "btree" ("customer_id");



CREATE INDEX "idx_customer_documents_customer_type" ON "public"."customer_documents" USING "btree" ("customer_id", "document_type");



CREATE INDEX "idx_customer_documents_document_number" ON "public"."customer_documents" USING "btree" ("document_number");



CREATE INDEX "idx_customer_documents_document_type" ON "public"."customer_documents" USING "btree" ("document_type");



CREATE INDEX "idx_customer_documents_generated_at" ON "public"."customer_documents" USING "btree" ("generated_at");



CREATE INDEX "idx_dsr_dealer_code" ON "public"."dealer_spare_requests" USING "btree" ("dealer_code");



CREATE INDEX "idx_dsr_reference_no" ON "public"."dealer_spare_requests" USING "btree" ("reference_no");



CREATE INDEX "idx_dsr_serial_number" ON "public"."dealer_spare_requests" USING "btree" ("serial_number");



CREATE INDEX "idx_dsr_spare_code" ON "public"."dealer_spare_requests" USING "btree" ("spare_code");



CREATE INDEX "idx_dsr_status" ON "public"."dealer_spare_requests" USING "btree" ("status");



CREATE INDEX "idx_dvr_dealer_code" ON "public"."dealer_vehicle_requests" USING "btree" ("dealer_code");



CREATE INDEX "idx_dvr_dealer_status" ON "public"."dealer_vehicle_requests" USING "btree" ("dealer_code", "status");



CREATE INDEX "idx_dvr_engine_number" ON "public"."dealer_vehicle_requests" USING "btree" ("engine_number");



CREATE INDEX "idx_dvr_reference_no" ON "public"."dealer_vehicle_requests" USING "btree" ("reference_no");



CREATE INDEX "idx_dvr_status" ON "public"."dealer_vehicle_requests" USING "btree" ("status");



CREATE INDEX "idx_ssr_reference_no" ON "public"."showroom_spare_requests" USING "btree" ("reference_no");



CREATE INDEX "idx_ssr_serial_number" ON "public"."showroom_spare_requests" USING "btree" ("serial_number");



CREATE INDEX "idx_ssr_showroom_code" ON "public"."showroom_spare_requests" USING "btree" ("showroom_code");



CREATE INDEX "idx_ssr_spare_code" ON "public"."showroom_spare_requests" USING "btree" ("spare_code");



CREATE INDEX "idx_ssr_status" ON "public"."showroom_spare_requests" USING "btree" ("status");



CREATE INDEX "idx_svr_engine_number" ON "public"."showroom_vehicle_requests" USING "btree" ("engine_number");



CREATE INDEX "idx_svr_reference_no" ON "public"."showroom_vehicle_requests" USING "btree" ("reference_no");



CREATE INDEX "idx_svr_showroom_code" ON "public"."showroom_vehicle_requests" USING "btree" ("showroom_code");



CREATE INDEX "idx_svr_status" ON "public"."showroom_vehicle_requests" USING "btree" ("status");



CREATE INDEX "sales_order_items_sale_id_idx" ON "public"."sales_order_items" USING "btree" ("sale_id");



CREATE UNIQUE INDEX "sales_order_items_unique_inventory" ON "public"."sales_order_items" USING "btree" ("item_type", "inventory_id");



CREATE OR REPLACE TRIGGER "update_company_documents_updated_at" BEFORE UPDATE ON "public"."company_documents" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_customer_documents_updated_at" BEFORE UPDATE ON "public"."customer_documents" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."company_documents"
    ADD CONSTRAINT "company_documents_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."Companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."customer_documents"
    ADD CONSTRAINT "customer_documents_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."Customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sales_order_items"
    ADD CONSTRAINT "sales_order_items_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "public"."sales_orders"("id") ON DELETE CASCADE;



ALTER TABLE "public"."Companies" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."Customers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "admin_all_company_documents" ON "public"."company_documents" USING ((("auth"."role"() = 'authenticated'::"text") AND (("auth"."jwt"() ->> 'role'::"text") = 'admin'::"text"))) WITH CHECK ((("auth"."role"() = 'authenticated'::"text") AND (("auth"."jwt"() ->> 'role'::"text") = 'admin'::"text")));



CREATE POLICY "admin_all_customer_documents" ON "public"."customer_documents" USING ((("auth"."role"() = 'authenticated'::"text") AND (("auth"."jwt"() ->> 'role'::"text") = 'admin'::"text"))) WITH CHECK ((("auth"."role"() = 'authenticated'::"text") AND (("auth"."jwt"() ->> 'role'::"text") = 'admin'::"text")));



CREATE POLICY "anon_read_sales_order_items" ON "public"."sales_order_items" FOR SELECT TO "anon" USING (true);



CREATE POLICY "anon_read_sales_orders" ON "public"."sales_orders" FOR SELECT TO "anon" USING (true);



CREATE POLICY "auth_insert_dsr" ON "public"."dealer_spare_requests" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "auth_insert_dvr" ON "public"."dealer_vehicle_requests" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "auth_insert_ssr" ON "public"."showroom_spare_requests" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "auth_insert_svr" ON "public"."showroom_vehicle_requests" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "auth_select_own_dsr" ON "public"."dealer_spare_requests" FOR SELECT TO "authenticated" USING ((("dealer_code")::"text" = ("auth"."jwt"() ->> 'dealer_code'::"text")));



CREATE POLICY "auth_select_own_dvr" ON "public"."dealer_vehicle_requests" FOR SELECT TO "authenticated" USING ((("dealer_code")::"text" = ("auth"."jwt"() ->> 'dealer_code'::"text")));



CREATE POLICY "auth_select_own_ssr" ON "public"."showroom_spare_requests" FOR SELECT TO "authenticated" USING ((("showroom_code")::"text" = ("auth"."jwt"() ->> 'showroom_code'::"text")));



CREATE POLICY "auth_select_own_svr" ON "public"."showroom_vehicle_requests" FOR SELECT TO "authenticated" USING ((("showroom_code")::"text" = ("auth"."jwt"() ->> 'showroom_code'::"text")));



CREATE POLICY "auth_update_own_dsr" ON "public"."dealer_spare_requests" FOR UPDATE TO "authenticated" USING (((("dealer_code")::"text" = ("auth"."jwt"() ->> 'dealer_code'::"text")) AND (("status")::"text" = 'PENDING'::"text")));



CREATE POLICY "auth_update_own_dvr" ON "public"."dealer_vehicle_requests" FOR UPDATE TO "authenticated" USING (((("dealer_code")::"text" = ("auth"."jwt"() ->> 'dealer_code'::"text")) AND (("status")::"text" = 'PENDING'::"text")));



CREATE POLICY "auth_update_own_ssr" ON "public"."showroom_spare_requests" FOR UPDATE TO "authenticated" USING (((("showroom_code")::"text" = ("auth"."jwt"() ->> 'showroom_code'::"text")) AND (("status")::"text" = 'PENDING'::"text")));



CREATE POLICY "auth_update_own_svr" ON "public"."showroom_vehicle_requests" FOR UPDATE TO "authenticated" USING (((("showroom_code")::"text" = ("auth"."jwt"() ->> 'showroom_code'::"text")) AND (("status")::"text" = 'PENDING'::"text")));



CREATE POLICY "authenticated_all_sales_order_items" ON "public"."sales_order_items" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "authenticated_all_sales_orders" ON "public"."sales_orders" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "companies_insert_auth" ON "public"."Companies" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "companies_select_auth" ON "public"."Companies" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "companies_update_auth" ON "public"."Companies" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



ALTER TABLE "public"."company_documents" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "company_view_own_documents" ON "public"."company_documents" FOR SELECT USING ((("auth"."role"() = 'authenticated'::"text") AND (("auth"."jwt"() ->> 'role'::"text") = 'company'::"text") AND ("company_id" IN ( SELECT "Companies"."id"
   FROM "public"."Companies"
  WHERE (("Companies"."company_email" = ("auth"."jwt"() ->> 'email'::"text")) OR ("Companies"."company_name" = ("auth"."jwt"() ->> 'company_name'::"text")))))));



ALTER TABLE "public"."customer_documents" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "customer_view_own_documents" ON "public"."customer_documents" FOR SELECT USING ((("auth"."role"() = 'authenticated'::"text") AND (("auth"."jwt"() ->> 'role'::"text") = 'customer'::"text") AND ("customer_id" = (("auth"."jwt"() ->> 'user_id'::"text"))::"uuid")));



CREATE POLICY "customer_view_purchase_documents" ON "public"."customer_documents" FOR SELECT USING ((("auth"."role"() = 'authenticated'::"text") AND (("auth"."jwt"() ->> 'role'::"text") = 'customer'::"text") AND ("customer_id" IN ( SELECT "Customers"."id"
   FROM "public"."Customers"
  WHERE ("Customers"."phone_number" = ("auth"."jwt"() ->> 'phone_number'::"text"))))));



CREATE POLICY "customers_insert_auth" ON "public"."Customers" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "customers_select_auth" ON "public"."Customers" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "customers_update_auth" ON "public"."Customers" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



ALTER TABLE "public"."dealer_spare_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."dealer_vehicle_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_delete" ON "public"."profiles" FOR DELETE TO "authenticated", "anon", "service_role" USING ((("auth"."role"() = 'service_role'::"text") OR ("auth"."uid"() = "id")));



CREATE POLICY "profiles_insert" ON "public"."profiles" FOR INSERT TO "authenticated", "anon", "service_role" WITH CHECK ((("auth"."role"() = 'service_role'::"text") OR ("auth"."uid"() = "id")));



CREATE POLICY "profiles_select" ON "public"."profiles" FOR SELECT TO "authenticated", "anon", "service_role" USING ((("auth"."role"() = 'service_role'::"text") OR ("auth"."uid"() = "id")));



CREATE POLICY "profiles_update" ON "public"."profiles" FOR UPDATE TO "authenticated", "anon", "service_role" USING ((("auth"."role"() = 'service_role'::"text") OR ("auth"."uid"() = "id"))) WITH CHECK ((("auth"."role"() = 'service_role'::"text") OR ("auth"."uid"() = "id")));



ALTER TABLE "public"."sales_order_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sales_orders" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "service_role_all_company_documents" ON "public"."company_documents" USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "service_role_all_customer_documents" ON "public"."customer_documents" USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "service_role_all_dsr" ON "public"."dealer_spare_requests" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_all_dvr" ON "public"."dealer_vehicle_requests" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_all_ssr" ON "public"."showroom_spare_requests" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_all_svr" ON "public"."showroom_vehicle_requests" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."showroom_spare_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."showroom_vehicle_requests" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "staff_manage_company_documents" ON "public"."company_documents" USING ((("auth"."role"() = 'authenticated'::"text") AND (("auth"."jwt"() ->> 'role'::"text") = ANY (ARRAY['admin'::"text", 'sales'::"text"])))) WITH CHECK ((("auth"."role"() = 'authenticated'::"text") AND (("auth"."jwt"() ->> 'role'::"text") = ANY (ARRAY['admin'::"text", 'sales'::"text"]))));



CREATE POLICY "staff_manage_customer_documents" ON "public"."customer_documents" USING ((("auth"."role"() = 'authenticated'::"text") AND (("auth"."jwt"() ->> 'role'::"text") = ANY (ARRAY['admin'::"text", 'sales'::"text"])))) WITH CHECK ((("auth"."role"() = 'authenticated'::"text") AND (("auth"."jwt"() ->> 'role'::"text") = ANY (ARRAY['admin'::"text", 'sales'::"text"]))));



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."get_company_document_count"("p_company_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_company_document_count"("p_company_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_company_document_count"("p_company_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_customer_document_count"("p_customer_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_customer_document_count"("p_customer_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_customer_document_count"("p_customer_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_request_totals"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_request_totals"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_request_totals"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON TABLE "public"."Companies" TO "anon";
GRANT ALL ON TABLE "public"."Companies" TO "authenticated";
GRANT ALL ON TABLE "public"."Companies" TO "service_role";



GRANT ALL ON TABLE "public"."Company" TO "anon";
GRANT ALL ON TABLE "public"."Company" TO "authenticated";
GRANT ALL ON TABLE "public"."Company" TO "service_role";



GRANT ALL ON TABLE "public"."Customers" TO "anon";
GRANT ALL ON TABLE "public"."Customers" TO "authenticated";
GRANT ALL ON TABLE "public"."Customers" TO "service_role";



GRANT ALL ON TABLE "public"."company_documents" TO "anon";
GRANT ALL ON TABLE "public"."company_documents" TO "authenticated";
GRANT ALL ON TABLE "public"."company_documents" TO "service_role";



GRANT ALL ON TABLE "public"."customer_documents" TO "anon";
GRANT ALL ON TABLE "public"."customer_documents" TO "authenticated";
GRANT ALL ON TABLE "public"."customer_documents" TO "service_role";



GRANT ALL ON TABLE "public"."dealer_spare_requests" TO "anon";
GRANT ALL ON TABLE "public"."dealer_spare_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."dealer_spare_requests" TO "service_role";



GRANT ALL ON TABLE "public"."dealer_vehicle_requests" TO "anon";
GRANT ALL ON TABLE "public"."dealer_vehicle_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."dealer_vehicle_requests" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."sales_order_items" TO "anon";
GRANT ALL ON TABLE "public"."sales_order_items" TO "authenticated";
GRANT ALL ON TABLE "public"."sales_order_items" TO "service_role";



GRANT ALL ON TABLE "public"."sales_orders" TO "anon";
GRANT ALL ON TABLE "public"."sales_orders" TO "authenticated";
GRANT ALL ON TABLE "public"."sales_orders" TO "service_role";



GRANT ALL ON TABLE "public"."showroom_spare_requests" TO "anon";
GRANT ALL ON TABLE "public"."showroom_spare_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."showroom_spare_requests" TO "service_role";



GRANT ALL ON TABLE "public"."showroom_vehicle_requests" TO "anon";
GRANT ALL ON TABLE "public"."showroom_vehicle_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."showroom_vehicle_requests" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";








import { NextResponse } from "next/server";

import { requireAdminRequest } from "@/lib/auth/require-admin-request";
import { verifyAdminCredentials } from "@/lib/auth/verify-admin-credentials";
import { ASB_SHOWROOMS_SCHEMA, WAREHOUSE_SCHEMA } from "@/lib/db/schema";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { AdminDeleteTarget } from "@/types/admin";

type DeleteConfig = {
  schema: "public" | typeof ASB_SHOWROOMS_SCHEMA | typeof WAREHOUSE_SCHEMA;
  table: string;
  key: string;
};

const DELETE_TARGETS: Record<AdminDeleteTarget, DeleteConfig> = {
  dealer: { schema: ASB_SHOWROOMS_SCHEMA, table: "dealers", key: "dealer_code" },
  showroom: {
    schema: ASB_SHOWROOMS_SCHEMA,
    table: "asb_showrooms",
    key: "showroom_code",
  },
  warehouse_vehicle: {
    schema: WAREHOUSE_SCHEMA,
    table: "vehicle_inventory",
    key: "id",
  },
  warehouse_spare: {
    schema: WAREHOUSE_SCHEMA,
    table: "vehicle_spare_inventory",
    key: "id",
  },
  vehicle_model: {
    schema: WAREHOUSE_SCHEMA,
    table: "vehicle_model_codes",
    key: "id",
  },
  spare_model: {
    schema: WAREHOUSE_SCHEMA,
    table: "vehicle_spare_codes",
    key: "id",
  },
  customer: { schema: "public", table: "Customers", key: "id" },
  company: { schema: "public", table: "Companies", key: "id" },
  sales_order: { schema: "public", table: "sales_orders", key: "id" },
  customer_document: {
    schema: "public",
    table: "customer_documents",
    key: "id",
  },
  company_document: {
    schema: "public",
    table: "company_documents",
    key: "id",
  },
  dealer_document: {
    schema: WAREHOUSE_SCHEMA,
    table: "dealer_documents",
    key: "id",
  },
  showroom_document: {
    schema: WAREHOUSE_SCHEMA,
    table: "showroom_documents",
    key: "id",
  },
  dealer_vehicle_request: {
    schema: "public",
    table: "dealer_vehicle_requests",
    key: "id",
  },
  dealer_spare_request: {
    schema: "public",
    table: "dealer_spare_requests",
    key: "id",
  },
  showroom_vehicle_request: {
    schema: "public",
    table: "showroom_vehicle_requests",
    key: "id",
  },
  showroom_spare_request: {
    schema: "public",
    table: "showroom_spare_requests",
    key: "id",
  },
};

const supabaseAdmin = getSupabaseAdmin();

export async function DELETE(req: Request) {
  try {
    const authResult = await requireAdminRequest(req);
    if (!authResult.ok) return authResult.response;

    const body = await req.json();
    const target = body.target as AdminDeleteTarget;
    const id = body.id;
    const config = DELETE_TARGETS[target];

    if (!config || id === undefined || id === null || id === "") {
      return NextResponse.json(
        { error: "Valid delete target and id are required" },
        { status: 400 }
      );
    }

    const verified = await verifyAdminCredentials(
      body.adminEmail,
      body.adminPassword
    );

    if (!verified) {
      return NextResponse.json(
        { error: "Invalid admin credentials" },
        { status: 401 }
      );
    }

    const query =
      config.schema === "public"
        ? supabaseAdmin.from(config.table)
        : supabaseAdmin.schema(config.schema).from(config.table);

    const { error, count } = await query
      .delete({ count: "exact" })
      .eq(config.key, id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, deleted: count ?? 0 });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

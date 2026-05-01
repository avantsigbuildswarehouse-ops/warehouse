//;

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireSalesRoute } from "@/lib/auth/require-sales-route";

export async function GET(req: Request) {
  const auth = await requireSalesRoute();
  if (auth.error) return auth.error;

  const { searchParams } = new URL(req.url);
  const targetType = (searchParams.get("targetType") || "").toLowerCase();
  const targetCode = searchParams.get("targetCode") || "";

  if (!["dealer", "showroom"].includes(targetType) || !targetCode) {
    return NextResponse.json({ error: "Invalid targetType/targetCode" }, { status: 400 });
  }

  // Enforce: non-admin can only access their own code
  if (auth.identity.role !== "admin" && auth.identity.code !== targetCode) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const schema = "ASB showrooms";
  const vehicleTable = targetType === "dealer" ? "dealer_vehicle_inventory" : "showroom_vehicle_inventory";
  const spareTable = targetType === "dealer" ? "dealer_spare_inventory" : "showroom_spare_inventory";
  const codeField = targetType === "dealer" ? "dealer_code" : "showroom_code";

  const [vehicles, spares] = await Promise.all([
    supabaseAdmin
      .schema(schema)
      .from(vehicleTable)
      .select("id, model_code, engine_number, chassis_number, color, yom, version, price, issued_at, sold_at")
      .eq(codeField, targetCode)
      .is("sold_at", null)
      .order("issued_at", { ascending: false })
      .limit(2000),
    supabaseAdmin
      .schema(schema)
      .from(spareTable)
      .select("id, model_code, spare_code, serial_number, price, issued_at, sold_at")
      .eq(codeField, targetCode)
      .is("sold_at", null)
      .order("issued_at", { ascending: false })
      .limit(2000),
  ]);

  if (vehicles.error) return NextResponse.json({ error: vehicles.error.message }, { status: 500 });
  if (spares.error) return NextResponse.json({ error: spares.error.message }, { status: 500 });

  return NextResponse.json({
    success: true,
    vehicles: vehicles.data ?? [],
    spares: spares.data ?? [],
  });
}


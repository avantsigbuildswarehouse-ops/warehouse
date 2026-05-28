import { NextResponse } from "next/server";

import { requireSalesRoute } from "@/lib/auth/require-sales-route";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const supabaseAdmin = getSupabaseAdmin();

function toNumber(value: number | string | null | undefined) {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value) || 0;
  return 0;
}

export async function GET(req: Request) {
  const auth = await requireSalesRoute();
  if (auth.error) return auth.error;

  try {
    const { searchParams } = new URL(req.url);
    const targetType = (searchParams.get("targetType") || "").toLowerCase();
    const targetCode = searchParams.get("targetCode") || "";
    const modelCode = searchParams.get("modelCode") || "";

    if (!["dealer", "showroom"].includes(targetType) || !targetCode || !modelCode) {
      return NextResponse.json({ error: "Invalid targetType, targetCode or modelCode" }, { status: 400 });
    }

    if (auth.identity.role !== "admin" && auth.identity.code !== targetCode) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const schema = "asb_showrooms";
    const vehicleTable = targetType === "dealer" ? "dealer_vehicle_inventory" : "showroom_vehicle_inventory";
    const codeField = targetType === "dealer" ? "dealer_code" : "showroom_code";

    const { data, error } = await supabaseAdmin
      .schema(schema)
      .from(vehicleTable)
      .select("id, model_code, engine_number, chassis_number, color, yom, version, price, sold_at")
      .eq(codeField, targetCode)
      .eq("model_code", modelCode)
      .is("sold_at", null)
      .order("issued_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const vehicles = (data ?? []).map((vehicle) => ({
      id: vehicle.id,
      model_code: vehicle.model_code,
      engine_number: vehicle.engine_number,
      chassis_number: vehicle.chassis_number,
      color: vehicle.color,
      yom: vehicle.yom,
      version: vehicle.version,
      price: toNumber(vehicle.price),
    }));

    return NextResponse.json({
      success: true,
      available: vehicles.length > 0,
      count: vehicles.length,
      vehicles,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to check model availability";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

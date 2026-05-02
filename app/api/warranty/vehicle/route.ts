//;

import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const supabaseAdmin = getSupabaseAdmin();

type SoldVehicleResult = {
  source: "dealer" | "showroom";
  model_code: string | null;
  engine_number: string | null;
  chassis_number: string | null;
  color: string | null;
  sold_at: string | null;
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const engine = searchParams.get("engine")?.trim() || "";
  const chassis = searchParams.get("chassis")?.trim() || "";
  const soldAt = searchParams.get("soldAt")?.trim() || "";

  if (!engine || !chassis || !soldAt) {
    return NextResponse.json({ error: "Missing engine/chassis/soldAt" }, { status: 400 });
  }

  const schema = "ASB showrooms";

  const [dealerMatch, showroomMatch] = await Promise.all([
    supabaseAdmin
      .schema(schema)
      .from("dealer_vehicle_inventory")
      .select("model_code, engine_number, chassis_number, color, sold_at")
      .eq("engine_number", engine)
      .eq("chassis_number", chassis)
      .eq("sold_at", soldAt)
      .maybeSingle(),
    supabaseAdmin
      .schema(schema)
      .from("showroom_vehicle_inventory")
      .select("model_code, engine_number, chassis_number, color, sold_at")
      .eq("engine_number", engine)
      .eq("chassis_number", chassis)
      .eq("sold_at", soldAt)
      .maybeSingle(),
  ]);

  if (dealerMatch.error) return NextResponse.json({ error: dealerMatch.error.message }, { status: 500 });
  if (showroomMatch.error) return NextResponse.json({ error: showroomMatch.error.message }, { status: 500 });

  let vehicle: SoldVehicleResult | null = null;
  if (dealerMatch.data) {
    vehicle = { source: "dealer", ...dealerMatch.data };
  } else if (showroomMatch.data) {
    vehicle = { source: "showroom", ...showroomMatch.data };
  }

  if (!vehicle) {
    return NextResponse.json({ valid: false, message: "Warranty record not found for provided QR data" }, { status: 404 });
  }

  return NextResponse.json({ valid: true, vehicle });
}

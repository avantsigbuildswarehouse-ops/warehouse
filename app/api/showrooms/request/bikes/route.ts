import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

type VehicleInventoryRow = {
  model_code: string;
  engine_number: string;
  chassis_number: string;
  color: string;
  yom: string | number | null;
  version: string | null;
  price: number | string;
  vehicle_model_codes?: { model_name?: string } | null;
};

export async function GET() {

  try {
    const { data, error } = await supabaseAdmin
      .schema("warehouse")
      .from("vehicle_inventory")
      .select(`
        model_code,
        engine_number,
        chassis_number,
        color,
        yom,
        version,
        price,
        vehicle_model_codes (
          model_name
        )
      `)
      .eq('status', "AVAILABLE")

    if (error) throw error;

    const items = (data as VehicleInventoryRow[]).map((row) => ({
      model_code: row.model_code,
      model_name: row.vehicle_model_codes?.model_name,
      engine_number: row.engine_number,
      chassis_number: row.chassis_number,
      color: row.color,
      yom: row.yom,
      version: row.version,
      price: row.price,
    }));

    return NextResponse.json({ items });

  } catch {
    return NextResponse.json(
      { error: "Failed to load available inventory" },
      { status: 500 }
    );
  }
}

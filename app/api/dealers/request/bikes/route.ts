import { NextResponse } from "next/server";
import { requireAdminRoute } from "@/lib/auth/require-admin-route";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  const authError = await requireAdminRoute();
  if (authError) return authError;

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

    if (error) throw error;

    const items = data.map((row: any) => ({
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

  } catch (error) {
    return NextResponse.json(
      { error: "Failed to load available inventory" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const supabaseAdmin = getSupabaseAdmin();

export async function GET() {

  try {
    const { data, error } = await supabaseAdmin
      .schema("warehouse")
      .from("vehicle_spare_inventory")
      .select(`
        model_code,
        spare_code,
        serial_number,
        vehicle_spare_codes (
          spare_name,
          price
        )
      `)
      .eq('status', "AVAILABLE")

    if (error) throw error;

    const items = (data ?? []).map((row: any) => ({
      model_code: row.model_code,
      spare_code: row.spare_code,
      spare_name: row.vehicle_spare_codes?.spare_name ?? row.spare_code,
      serial_number: row.serial_number,
      price: Number(row.vehicle_spare_codes?.price ?? 0), // ✅ pulled from the join
    }));

    return NextResponse.json({ items });

  } catch (error: any) {
    console.error("AVAILABLE SPARES ERROR:", error);
    return NextResponse.json(
      { error: error.message || error },
      { status: 500 }
    );
  }
}
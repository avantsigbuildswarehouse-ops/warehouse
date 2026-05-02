import { NextResponse } from "next/server";
import { requireAdminRoute } from "@/lib/auth/require-admin-route";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const supabaseAdmin = getSupabaseAdmin();

export async function GET() {
  const authError = await requireAdminRoute();
  if (authError) return authError;

  try {
    const { data, error } = await supabaseAdmin
      .schema("warehouse")
      .from("vehicle_spare_inventory")
      .select(`
        model_code,
        spare_code,
        serial_number,
        price,
        vehicle_spare_codes (
          spare_name
        )
      `)
      .eq("status", "AVAILABLE");

    if (error) throw error;

    const items = data.map((row: any) => ({
      model_code: row.model_code,
      spare_code: row.spare_code,
      spare_name: row.vehicle_spare_codes?.spare_name,
      serial_number: row.serial_number,
      price: row.price,
    }));

    return NextResponse.json({ items });

  } catch (error) {
    return NextResponse.json(
      { error: "Failed to load available spares" },
      { status: 500 }
    );
  }
}

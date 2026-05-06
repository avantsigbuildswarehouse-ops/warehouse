import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase/admin";

const supabaseAdmin = getSupabaseAdmin();

type SpareInventoryRow = {
  model_code: string;
  spare_code: string;
  serial_number: string;
  vehicle_spare_codes?: {
    spare_name?: string | null;
    price?: number | string | null;
  } | null;
};

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
      .eq("status", "AVAILABLE");

    if (error) throw error;

    const items = ((data ?? []) as SpareInventoryRow[])
      .sort((a, b) => {
        if (a.spare_code !== b.spare_code) return a.spare_code.localeCompare(b.spare_code);
        return a.serial_number.localeCompare(b.serial_number);
      })
      .map((row) => ({
        model_code: row.model_code,
        spare_code: row.spare_code,
        spare_name: row.vehicle_spare_codes?.spare_name ?? row.spare_code,
        serial_number: row.serial_number,
        price: Number(row.vehicle_spare_codes?.price ?? 0),
      }));

    return NextResponse.json({ items });
  } catch (error: unknown) {
    console.error("AVAILABLE SPARES ERROR:", error);
    const message = error instanceof Error ? error.message : "Failed to load available spares";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

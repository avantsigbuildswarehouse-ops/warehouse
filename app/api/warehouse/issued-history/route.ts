import "server-only";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");

    const rows: any[] = [];

    /* ---------------- SHOWROOM ---------------- */

    if (!type || type === "all" || type === "showroom") {
      const { data: showroomBikes } = await supabaseAdmin
        .schema("ASB showrooms")
        .from("showroom_vehicle_inventory")
        .select("*");

      const { data: showroomSpares } = await supabaseAdmin
        .schema("ASB showrooms")
        .from("showroom_spare_inventory")
        .select("*");

      showroomBikes?.forEach((row) =>
        rows.push({
          type: "Bike",
          target: "Showroom",
          target_code: row.showroom_code,
          model_code: row.model_code,
          identifier: row.engine_number,
          price: row.price,
          issued_at: row.issued_at,
        })
      );

      showroomSpares?.forEach((row) =>
        rows.push({
          type: "Spare",
          target: "Showroom",
          target_code: row.showroom_code,
          model_code: row.spare_code,
          identifier: row.serial_number,
          price: row.price,
          issued_at: row.issued_at,
        })
      );
    }

    /* ---------------- DEALER ---------------- */

    if (!type || type === "all" || type === "dealer") {
      const { data: dealerBikes } = await supabaseAdmin
        .schema("ASB showrooms")
        .from("dealer_vehicle_inventory")
        .select("*");

      const { data: dealerSpares } = await supabaseAdmin
        .schema("ASB showrooms")
        .from("dealer_spare_inventory")
        .select("*");

      dealerBikes?.forEach((row) =>
        rows.push({
          type: "Bike",
          target: "Dealer",
          target_code: row.dealer_code,
          model_code: row.model_code,
          identifier: row.engine_number,
          price: row.price,
          issued_at: row.issued_at,
        })
      );

      dealerSpares?.forEach((row) =>
        rows.push({
          type: "Spare",
          target: "Dealer",
          target_code: row.dealer_code,
          model_code: row.spare_code,
          identifier: row.serial_number,
          price: row.price, 
          issued_at: row.issued_at,
        })
      );
    }

    return NextResponse.json({ items: rows });

  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch issued history" },
      { status: 500 }
    );
  }
}

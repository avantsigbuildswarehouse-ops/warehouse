import "server-only";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { targetType, targetCode, itemType, items } = body;

    if (!targetType || !targetCode || !itemType || !Array.isArray(items) || !items.length) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const issuedAt = new Date().toISOString();

    const cleanItems = items.map((x: string) => x.trim());

    // ======================================================
    // 🚗 BIKE ISSUE FLOW
    // ======================================================
    if (itemType === "Bike") {
      const { data: fetchBikes, error: fetchErr } = await supabaseAdmin
        .schema("warehouse")
        .from("vehicle_inventory")
        .select("*")
        .eq("status", "AVAILABLE")
        .in("engine_number", cleanItems)
        .limit(1000);

      if (fetchErr) throw new Error(fetchErr.message);

      if (!fetchBikes || fetchBikes.length === 0) {
        throw new Error("No AVAILABLE bikes found (check status or engine numbers)");
      }

      const insertTable =
        targetType === "ASB_Showroom"
          ? "showroom_vehicle_inventory"
          : "dealer_vehicle_inventory";

      const assignField =
        targetType === "ASB_Showroom" ? "showroom_code" : "dealer_code";

      const insertPayload = fetchBikes.map((bike: any) => ({
        [assignField]: targetCode,
        model_code: bike.model_code,
        engine_number: bike.engine_number,
        chassis_number: bike.chassis_number,
        color: bike.color,
        yom: bike.yom,
        version: bike.version,
        price: bike.price,
        issued_at: issuedAt,
      }));

      const { error: insertErr } = await supabaseAdmin
        .schema("ASB showrooms")
        .from(insertTable)
        .insert(insertPayload);

      if (insertErr) throw new Error(insertErr.message);

      // 🔥 UPDATE MAIN INVENTORY (IMPORTANT: verify update)
      const { data: updatedBikes, error: updateErr } = await supabaseAdmin
        .schema("warehouse")
        .from("vehicle_inventory")
        .update({
          status: "ISSUED",
          issued_to: targetCode,
          issued_at: issuedAt,
        })
        .eq("status", "AVAILABLE")
        .in("engine_number", cleanItems)
        .select();

      if (updateErr) throw new Error(updateErr.message);

      if (!updatedBikes || updatedBikes.length === 0) {
        throw new Error("No bikes were updated — status mismatch or invalid engine numbers");
      }

      return NextResponse.json({
        success: true,
        count: updatedBikes.length,
      });
    }

    // ======================================================
    // 🧰 SPARE ISSUE FLOW
    // ======================================================
    if (itemType === "Spare") {
      const { data: fetchSpares, error: fetchErr } = await supabaseAdmin
        .schema("warehouse")
        .from("vehicle_spare_inventory")
        .select("*")
        .eq("status", "AVAILABLE")
        .in("serial_number", cleanItems)
        .limit(1000);

      if (fetchErr) throw new Error(fetchErr.message);

      if (!fetchSpares || fetchSpares.length === 0) {
        throw new Error("No AVAILABLE spares found (check status or serial numbers)");
      }

      const insertTable =
        targetType === "ASB_Showroom"
          ? "showroom_spare_inventory"
          : "dealer_spare_inventory";

      const assignField =
        targetType === "ASB_Showroom" ? "showroom_code" : "dealer_code";

      const insertPayload = fetchSpares.map((spare: any) => ({
        [assignField]: targetCode,
        model_code: spare.model_code,
        spare_code: spare.spare_code,
        serial_number: spare.serial_number,
        price: spare.price,
        issued_at: issuedAt,
      }));

      const { error: insertErr } = await supabaseAdmin
        .schema("ASB showrooms")
        .from(insertTable)
        .insert(insertPayload);

      if (insertErr) throw new Error(insertErr.message);

      // 🔥 UPDATE MAIN INVENTORY (verified)
      const { data: updatedSpares, error: updateErr } = await supabaseAdmin
        .schema("warehouse")
        .from("vehicle_spare_inventory")
        .update({
          status: "ISSUED",
          issued_to: targetCode,
          issued_at: issuedAt,
        })
        .eq("status", "AVAILABLE")
        .in("serial_number", cleanItems)
        .select();

      if (updateErr) throw new Error(updateErr.message);

      if (!updatedSpares || updatedSpares.length === 0) {
        throw new Error("No spares were updated — status mismatch or invalid serial numbers");
      }

      return NextResponse.json({
        success: true,
        count: updatedSpares.length,
      });
    }

    return NextResponse.json(
      { error: "Invalid itemType" },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("Issue Stock Error:", error);

    return NextResponse.json(
      { error: error.message || "Failed to process issue" },
      { status: 500 }
    );
  }
}

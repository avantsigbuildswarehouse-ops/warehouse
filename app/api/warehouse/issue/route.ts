import { NextResponse } from "next/server";

import { requireAdminRoute } from "@/lib/auth/require-admin-route";
import {
  syncSpareCodeQuantities,
  syncVehicleModelQuantities,
} from "@/lib/warehouse/quantity-sync";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const supabaseAdmin = getSupabaseAdmin();

type WarehouseBikeRow = {
  model_code: string;
  engine_number: string;
  chassis_number: string;
  color: string | null;
  yom: string | null;
  version: string | null;
  price: number | string | null;
};

type WarehouseSpareRow = {
  model_code: string;
  spare_code: string;
  serial_number: string;
  price: number | string | null;
};

export async function POST(req: Request) {
  const authError = await requireAdminRoute();
  if (authError) return authError;

  try {
    const body = await req.json();
    const { targetType, targetCode, itemType, items } = body;

    if (!targetType || !targetCode || !itemType || !Array.isArray(items) || !items.length) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const issuedAt = new Date().toISOString();
    const cleanItems = items.map((item: string) => item.trim());
    const isShowroomTarget = targetType === "ASB_Showroom";
    const isDealerTarget = targetType === "Dealer";

    if ((!isShowroomTarget && !isDealerTarget) || !["Bike", "Spare"].includes(itemType)) {
      return NextResponse.json({ error: "Invalid targetType or itemType" }, { status: 400 });
    }

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
      if (fetchBikes.length !== cleanItems.length) {
        throw new Error("Some selected bikes are no longer available");
      }

      const insertTable = isShowroomTarget
        ? "showroom_vehicle_inventory"
        : "dealer_vehicle_inventory";
      const assignField = isShowroomTarget ? "showroom_code" : "dealer_code";

      const insertPayload = (fetchBikes as WarehouseBikeRow[]).map((bike) => ({
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
        .select("model_code, engine_number, chassis_number, color, yom, version, price");

      if (updateErr) throw new Error(updateErr.message);
      if (!updatedBikes || updatedBikes.length === 0) {
        throw new Error("No bikes were updated due to a status mismatch");
      }

      await syncVehicleModelQuantities(
        (updatedBikes as WarehouseBikeRow[]).map((bike) => bike.model_code)
      );

      return NextResponse.json({ success: true, count: updatedBikes.length });
    }

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
      if (fetchSpares.length !== cleanItems.length) {
        throw new Error("Some selected spares are no longer available");
      }

      const insertTable = isShowroomTarget
        ? "showroom_spare_inventory"
        : "dealer_spare_inventory";
      const assignField = isShowroomTarget ? "showroom_code" : "dealer_code";

      const insertPayload = (fetchSpares as WarehouseSpareRow[]).map((spare) => ({
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
        .select("model_code, spare_code, serial_number, price");

      if (updateErr) throw new Error(updateErr.message);
      if (!updatedSpares || updatedSpares.length === 0) {
        throw new Error("No spares were updated due to a status mismatch");
      }

      await syncSpareCodeQuantities(
        (updatedSpares as WarehouseSpareRow[]).map((spare) => ({
          modelCode: spare.model_code,
          spareCode: spare.spare_code,
        }))
      );

      return NextResponse.json({ success: true, count: updatedSpares.length });
    }

    return NextResponse.json({ error: "Invalid itemType" }, { status: 400 });
  } catch (error: unknown) {
    console.error("Issue Stock Error:", error);
    const message = error instanceof Error ? error.message : "Failed to process issue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

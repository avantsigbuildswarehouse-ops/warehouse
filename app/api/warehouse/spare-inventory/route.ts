// app/api/warehouse/spare-inventory/route.ts
import { NextResponse } from "next/server";
import { requireAdminRoute } from "@/lib/auth/require-admin-route";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const supabaseAdmin = getSupabaseAdmin();

type SparePayload = {
  serialNumber: string;
};

export async function GET() {
  const authError = await requireAdminRoute();
  if (authError) return authError;

  try {
    // 1. Fetch all inventory rows
    const { data: inventoryRows, error: inventoryError } = await supabaseAdmin
      .schema("warehouse")
      .from("vehicle_spare_inventory")
      .select("model_code, spare_code, serial_number, status, price");

    if (inventoryError) throw inventoryError;

    const rows = inventoryRows ?? [];

    if (rows.length === 0) {
      return NextResponse.json({
        summary: { totalUnits: 0, totalSpareTypes: 0, totalValue: 0 },
        items: [],
      });
    }

    // 2. Fetch model names
    const modelCodes = [...new Set(rows.map((r) => r.model_code))];
    const { data: modelRows, error: modelError } = await supabaseAdmin
      .schema("warehouse")
      .from("vehicle_model_codes")
      .select("model_code, model_name")
      .in("model_code", modelCodes);

    if (modelError) throw modelError;

    // 3. Fetch spare names + quantities
    const spareCodes = [...new Set(rows.map((r) => r.spare_code))];
    const { data: spareRows, error: spareError } = await supabaseAdmin
      .schema("warehouse")
      .from("vehicle_spare_codes")
      .select("spare_code, spare_name, warehouse_quantity")
      .in("spare_code", spareCodes);

    if (spareError) throw spareError;

    // 4. Build lookup maps
    const modelMap = new Map(
      (modelRows ?? []).map((m) => [m.model_code, m.model_name])
    );
    const spareMap = new Map(
      (spareRows ?? []).map((s) => [
        s.spare_code,
        { spare_name: s.spare_name, quantity: s.warehouse_quantity },
      ])
    );

    // 5. Assemble items
    const items = rows.map((row) => ({
      model_code: row.model_code,
      model_name: modelMap.get(row.model_code) ?? row.model_code,
      spare_code: row.spare_code,
      spare_name: spareMap.get(row.spare_code)?.spare_name ?? row.spare_code,
      serial_number: row.serial_number,
      status: row.status,
      price: Number(row.price ?? 0),
      stock_quantity: Number(spareMap.get(row.spare_code)?.quantity ?? 0),
    }));

    const totalValue = items.reduce((sum, item) => sum + item.price, 0);
    const totalSpareTypes = new Set(items.map((i) => i.spare_code)).size;

    return NextResponse.json({
      summary: {
        totalUnits: items.length,
        totalSpareTypes,
        totalValue,
      },
      items,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load spare inventory",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const authError = await requireAdminRoute();
  if (authError) return authError;

  const body = await req.json();

  if (!body.spareCode || !body.modelCode) {
    return NextResponse.json(
      { error: "Missing modelCode or spareCode" },
      { status: 400 }
    );
  }

  if (!Array.isArray(body.spares)) {
    return NextResponse.json(
      { error: "Invalid spares array" },
      { status: 400 }
    );
  }

  const { data: spareMeta, error: spareError } = await supabaseAdmin
    .schema("warehouse")
    .from("vehicle_spare_codes")
    .select("price, warehouse_quantity, arrived_quantity")
    .eq("model_code", body.modelCode)
    .eq("spare_code", body.spareCode)
    .single();

  if (spareError || !spareMeta) {
    return NextResponse.json(
      { error: spareError?.message || "Spare not found" },
      { status: 404 }
    );
  }

  const price = Number(spareMeta.price ?? 0);

  const rows = (body.spares as SparePayload[])
    .filter((s) => s.serialNumber)
    .map((spare) => ({
      model_code: body.modelCode,
      spare_code: body.spareCode,
      serial_number: spare.serialNumber,
      price,
    }));

  if (rows.length === 0) {
    return NextResponse.json(
      { error: "No valid serial numbers provided" },
      { status: 400 }
    );
  }

  const { error: insertError } = await supabaseAdmin
    .schema("warehouse")
    .from("vehicle_spare_inventory")
    .insert(rows);

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  const newQty = Number(spareMeta.arrived_quantity ?? 0) + rows.length;
  const newQty2 = Number(spareMeta.warehouse_quantity ?? 0) + rows.length;

  const { error: updateError } = await supabaseAdmin
    .schema("warehouse")
    .from("vehicle_spare_codes")
    .update({ arrived_quantity: newQty, warehouse_quantity: newQty2 })
    .eq("model_code", body.modelCode)
    .eq("spare_code", body.spareCode);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, added: rows.length, priceUsed: price });
}
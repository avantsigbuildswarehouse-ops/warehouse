import { NextResponse } from "next/server";

import { requireAdminRoute } from "@/lib/auth/require-admin-route";
import { parseStockFile, normalizeMatchValue, toVehicleRows } from "@/lib/import/stock-file-parser";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { syncVehicleModelQuantities } from "@/lib/warehouse/quantity-sync";

const supabaseAdmin = getSupabaseAdmin();

export async function POST(req: Request) {
  const authError = await requireAdminRoute();
  if (authError) return authError;

  try {
    const formData = await req.formData();
    const modelCode = String(formData.get("modelCode") ?? "").trim();
    const file = formData.get("file");

    if (!modelCode || !(file instanceof File)) {
      return NextResponse.json({ error: "Model and import file are required" }, { status: 400 });
    }

    const { data: model, error: modelError } = await supabaseAdmin
      .schema("warehouse")
      .from("vehicle_model_codes")
      .select("model_code, model_name, price")
      .eq("model_code", modelCode)
      .single();

    if (modelError || !model) {
      return NextResponse.json({ error: "Selected model was not found" }, { status: 404 });
    }

    const table = await parseStockFile(file);
    const parsedRows = toVehicleRows(table);
    const selectedModelValues = new Set([
      normalizeMatchValue(model.model_code),
      normalizeMatchValue(model.model_name),
    ]);

    const matchedRows = parsedRows.filter((row) =>
      selectedModelValues.has(normalizeMatchValue(row.sourceModel))
    );
    const rejectedRows = parsedRows.length - matchedRows.length;

    const rows = matchedRows
      .filter((row) => row.engineNumber && row.chassisNumber)
      .map((row) => ({
        model_code: model.model_code,
        engine_number: row.engineNumber,
        chassis_number: row.chassisNumber,
        color: row.color,
        yom: row.yom,
        version: row.version,
        price: model.price,
      }));

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "No rows matched the selected model with valid engine and chassis numbers" },
        { status: 400 }
      );
    }

    const { error: insertError } = await supabaseAdmin
      .schema("warehouse")
      .from("vehicle_inventory")
      .insert(rows);

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    await syncVehicleModelQuantities([model.model_code]);

    return NextResponse.json({
      success: true,
      added: rows.length,
      skipped: rejectedRows + (matchedRows.length - rows.length),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to import vehicle file" },
      { status: 400 }
    );
  }
}

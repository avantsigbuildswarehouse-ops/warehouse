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

    // Prepare rows for insertion with proper data types
    const rowsToInsert = matchedRows
      .filter((row) => row.engineNumber && row.chassisNumber)
      .map((row) => ({
        model_code: model.model_code,
        make: row.make || null,
        engine_capacity: row.engineCapacity ? String(row.engineCapacity) : null,
        bike_category: row.bikeCategory || null,
        engine_number: String(row.engineNumber).trim(),
        chassis_number: String(row.chassisNumber).trim(),
        color: row.color || null,
        version: row.version,
        yom: row.yom || null,
        price: typeof model.price === 'string' ? parseFloat(model.price) : (model.price || null),
      }));

    // Log debug information
    //console.log('Selected model values:', Array.from(selectedModelValues));
    //console.log('First few rows sourceModel:', parsedRows.slice(0,3).map(r => r.sourceModel));
    //console.log('Normalized comparison:', parsedRows.slice(0,3).map(r => ({
      //original: r.sourceModel,
      //normalized: normalizeMatchValue(r.sourceModel)
    //})));
    //console.log('First matched row:', matchedRows[0]);
    //console.log('Rows to insert count:', rowsToInsert.length);

    if (rowsToInsert.length === 0) {
      return NextResponse.json(
        { error: "No rows matched the selected model with valid engine and chassis numbers" },
        { status: 400 }
      );
    }

    // Check for duplicates before inserting
    const engineNumbers = rowsToInsert.map(r => r.engine_number);
    const chassisNumbers = rowsToInsert.map(r => r.chassis_number);

    const { data: existingVehicles, error: fetchError } = await supabaseAdmin
      .schema("warehouse")
      .from("vehicle_inventory")
      .select("engine_number, chassis_number")
      .or(`engine_number.in.(${engineNumbers.join(',')}),chassis_number.in.(${chassisNumbers.join(',')})`);

    if (fetchError) {
      console.error('Error checking duplicates:', fetchError);
    }

    const existingEngineNumbers = new Set(existingVehicles?.map(v => v.engine_number) || []);
    const existingChassisNumbers = new Set(existingVehicles?.map(v => v.chassis_number) || []);

    const uniqueRows = rowsToInsert.filter(row => 
      !existingEngineNumbers.has(row.engine_number) && 
      !existingChassisNumbers.has(row.chassis_number)
    );

    const duplicateCount = rowsToInsert.length - uniqueRows.length;

    if (uniqueRows.length === 0) {
      return NextResponse.json(
        { error: "All vehicles already exist in inventory (duplicate engine or chassis numbers)" },
        { status: 400 }
      );
    }

    // Insert unique rows
    const { error: insertError } = await supabaseAdmin
      .schema("warehouse")
      .from("vehicle_inventory")
      .insert(uniqueRows);

    if (insertError) {
      console.error('Insert error details:', {
        message: insertError.message,
        code: insertError.code,
        details: insertError.details,
        hint: insertError.hint
      });
      
      if (insertError.message.includes('duplicate') || insertError.code === '23505') {
        let successfullyInserted = 0;
        const failedRows = [];
        
        for (const row of uniqueRows) {
          const { error: singleInsertError } = await supabaseAdmin
            .schema("warehouse")
            .from("vehicle_inventory")
            .insert(row);
          
          if (singleInsertError) {
            failedRows.push({ row, error: singleInsertError.message });
            console.error('Failed to insert row:', row, singleInsertError);
          } else {
            successfullyInserted++;
          }
        }
        
        if (successfullyInserted > 0) {
          await syncVehicleModelQuantities([model.model_code]);
          return NextResponse.json({
            success: true,
            added: successfullyInserted,
            skipped: rejectedRows + duplicateCount + failedRows.length,
            message: `Successfully inserted ${successfullyInserted} out of ${rowsToInsert.length} vehicles. ${failedRows.length} failed due to data issues.`
          });
        }
        
        return NextResponse.json(
          { error: `Failed to insert vehicles. ${failedRows.length} rows have data issues.` },
          { status: 500 }
        );
      }
      
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    await syncVehicleModelQuantities([model.model_code]);

    return NextResponse.json({
      success: true,
      added: uniqueRows.length,
      skipped: rejectedRows + duplicateCount,
      message: duplicateCount > 0 ? `Skipped ${duplicateCount} duplicate vehicle(s)` : undefined
    });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to import vehicle file" },
      { status: 400 }
    );
  }
}
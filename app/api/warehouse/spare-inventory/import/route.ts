import { NextResponse } from "next/server";

import { requireAdminRoute } from "@/lib/auth/require-admin-route";
import { normalizeMatchValue, parseStockFile, toSpareRows } from "@/lib/import/stock-file-parser";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { syncSpareCodeQuantities } from "@/lib/warehouse/quantity-sync";

const supabaseAdmin = getSupabaseAdmin();

function makeSpareCode(name: string, attempt: number) {
  const prefix = name
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 3)
    .toUpperCase()
    .padEnd(3, "X");

  return `${prefix}-${String(Date.now() + attempt).slice(-5)}`;
}

export async function POST(req: Request) {
  const authError = await requireAdminRoute();
  if (authError) return authError;

  try {
    const formData = await req.formData();
    const modelCode = String(formData.get("modelCode") ?? "").trim();
    const spareCode = String(formData.get("spareCode") ?? "").trim();
    const autoCreateSpares = String(formData.get("autoCreateSpares") ?? "false").toLowerCase() === "true";
    const file = formData.get("file");

    if (!modelCode || !(file instanceof File)) {
      return NextResponse.json({ error: "Model code and import file are required" }, { status: 400 });
    }

    // Get the model
    const { data: model, error: modelError } = await supabaseAdmin
      .schema("warehouse")
      .from("vehicle_model_codes")
      .select("model_code, model_name")
      .eq("model_code", modelCode)
      .single();

    if (modelError || !model) {
      return NextResponse.json({ error: "Selected model was not found" }, { status: 404 });
    }

    // If spareCode is provided, get the spare details
    let spare = null;
    if (spareCode) {
      const { data: spareData, error: spareError } = await supabaseAdmin
        .schema("warehouse")
        .from("vehicle_spare_codes")
        .select("model_code, spare_code, spare_name, price")
        .eq("model_code", modelCode)
        .eq("spare_code", spareCode)
        .single();

      if (spareError || !spareData) {
        return NextResponse.json({ error: "Selected spare code was not found" }, { status: 404 });
      }
      spare = spareData;
    }

    // Parse the file
    const table = await parseStockFile(file);
    const parsedRows = toSpareRows(table);
    const selectedModelValues = new Set([
      normalizeMatchValue(model.model_code),
      normalizeMatchValue(model.model_name),
    ]);

    // Filter rows by model
    const modelMatchedRows = parsedRows.filter((row) =>
      selectedModelValues.has(normalizeMatchValue(row.sourceModel))
    );
    const modelRejectedRows = parsedRows.length - modelMatchedRows.length;

    // If spareCode is provided, filter by spare as well
    let rowsToProcess = modelMatchedRows;
    if (spare) {
      const selectedSpareValues = new Set([
        normalizeMatchValue(spare.spare_code),
        normalizeMatchValue(spare.spare_name),
      ]);
      rowsToProcess = modelMatchedRows.filter((row) =>
        !row.sourceSpare || selectedSpareValues.has(normalizeMatchValue(row.sourceSpare))
      );
    }

    // Group rows by spare name for auto-creation
    const rowsBySpare = new Map<string, typeof modelMatchedRows>();
    const rowsWithoutSpareName: typeof modelMatchedRows = [];

    for (const row of rowsToProcess) {
      if (row.sourceSpare) {
        if (!rowsBySpare.has(row.sourceSpare)) {
          rowsBySpare.set(row.sourceSpare, []);
        }
        rowsBySpare.get(row.sourceSpare)!.push(row);
      } else if (spare) {
        rowsWithoutSpareName.push(row);
      }
    }

    // Process spares
    const spareCodeMap = new Map<string, { code: string; price: number }>();
    let totalSkipped = 0;

    // If specific spare provided, use it
    if (spare) {
      spareCodeMap.set(spare.spare_name, {
        code: spare.spare_code,
        price: Number(spare.price ?? 0),
      });
      // Add rows without spare name to the spare's rows
      rowsBySpare.set(spare.spare_name, [
        ...(rowsBySpare.get(spare.spare_name) ?? []),
        ...rowsWithoutSpareName,
      ]);
    } else if (autoCreateSpares) {
      // Auto-create spares if requested and not provided
      for (const [spareName, rows] of rowsBySpare.entries()) {
        // Get price from first row or use 0
        const price = rows[0]?.price ?? 0;

        // First, check if a spare with this name already exists for this model
        const { data: existingSpareByName } = await supabaseAdmin
          .schema("warehouse")
          .from("vehicle_spare_codes")
          .select("spare_code, price")
          .eq("model_code", modelCode)
          .eq("spare_name", spareName)
          .single();

        if (existingSpareByName) {
          // Use existing spare code
          spareCodeMap.set(spareName, {
            code: existingSpareByName.spare_code,
            price: Number(existingSpareByName.price ?? price),
          });
          continue;
        }

        // Try to find or create spare if it doesn't exist by name
        let spareCode = null;
        let lastError = null;

        for (let attempt = 0; attempt < 3; attempt++) {
          const code = makeSpareCode(spareName, attempt);
          const { data: existingSpare } = await supabaseAdmin
            .schema("warehouse")
            .from("vehicle_spare_codes")
            .select("spare_code")
            .eq("model_code", modelCode)
            .eq("spare_code", code)
            .single();

          if (existingSpare) {
            spareCode = code;
            break;
          }

          // Try to insert new spare
          const { data: createdSpare, error: createError } = await supabaseAdmin
            .schema("warehouse")
            .from("vehicle_spare_codes")
            .insert({
              model_code: modelCode,
              spare_name: spareName,
              spare_code: code,
              price: price,
              warehouse_quantity: 0,
              arrived_quantity: 0,
            })
            .select()
            .single();

          if (!createError) {
            spareCode = code;
            break;
          }

          lastError = createError.message;
          if (createError.code !== "23505") break; // If not duplicate key error, stop retrying
        }

        if (spareCode) {
          spareCodeMap.set(spareName, { code: spareCode, price });
        } else {
          totalSkipped += rows.length;
        }
      }
    } else {
      // If spareCode not provided and autoCreateSpares is false, skip rows with spare names
      totalSkipped += rowsBySpare.size > 0 ? Array.from(rowsBySpare.values()).reduce((sum, rows) => sum + rows.length, 0) : 0;
      rowsBySpare.clear();
    }

    // Build final rows to insert
    const finalRows: Array<{ model_code: string; spare_code: string; serial_number: string; price: number }> = [];

    for (const [spareName, rows] of rowsBySpare.entries()) {
      const spareInfo = spareCodeMap.get(spareName);
      if (!spareInfo) continue;

      for (const row of rows) {
        if (row.serialNumber) {
          finalRows.push({
            model_code: modelCode,
            spare_code: spareInfo.code,
            serial_number: row.serialNumber,
            price: row.price ?? spareInfo.price,
          });
        } else {
          totalSkipped++;
        }
      }
    }

    // Add rows without spare name (only if spare is provided)
    if (spare && rowsWithoutSpareName.length > 0) {
      for (const row of rowsWithoutSpareName) {
        if (row.serialNumber) {
          finalRows.push({
            model_code: modelCode,
            spare_code: spare.spare_code,
            serial_number: row.serialNumber,
            price: row.price ?? Number(spare.price ?? 0),
          });
        } else {
          totalSkipped++;
        }
      }
    }

    if (finalRows.length === 0) {
      return NextResponse.json(
        { error: "No rows to import. Either provide a spare code or enable auto-create spares." },
        { status: 400 }
      );
    }

    // Insert all rows
    const { error: insertError } = await supabaseAdmin
      .schema("warehouse")
      .from("vehicle_spare_inventory")
      .insert(finalRows);

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Sync quantities for all affected spares
    const spareCodesToSync = Array.from(spareCodeMap.values()).map((info) => ({
      modelCode,
      spareCode: info.code,
    }));
    await syncSpareCodeQuantities(spareCodesToSync).catch(() => undefined);

    return NextResponse.json({
      success: true,
      added: finalRows.length,
      skipped: totalSkipped + modelRejectedRows,
      createdSpares: spareCodeMap.size,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to import spare file" },
      { status: 400 }
    );
  }
}

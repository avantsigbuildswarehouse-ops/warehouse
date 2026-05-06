import { getSupabaseAdmin } from "@/lib/supabase/admin";

const supabaseAdmin = getSupabaseAdmin();

type SpareKey = {
  modelCode: string;
  spareCode: string;
};

function unique<T>(values: T[]) {
  return Array.from(new Set(values));
}

export async function syncVehicleModelQuantities(modelCodes: string[]) {
  const codes = unique(modelCodes.filter(Boolean));
  if (codes.length === 0) return;

  const { data, error } = await supabaseAdmin
    .schema("warehouse")
    .from("vehicle_inventory")
    .select("model_code, status")
    .in("model_code", codes);

  if (error) throw new Error(error.message);

  for (const modelCode of codes) {
    const rows = (data ?? []).filter((row) => row.model_code === modelCode);
    const arrivedQuantity = rows.length;
    const warehouseQuantity = rows.filter((row) => row.status !== "ISSUED").length;

    const { error: updateError } = await supabaseAdmin
      .schema("warehouse")
      .from("vehicle_model_codes")
      .update({
        arrived_quantity: arrivedQuantity,
        warehouse_quantity: warehouseQuantity,
      })
      .eq("model_code", modelCode);

    if (updateError) throw new Error(updateError.message);
  }
}

export async function syncSpareCodeQuantities(spareKeys: SpareKey[]) {
  const keys = unique(
    spareKeys
      .filter((key) => key.modelCode && key.spareCode)
      .map((key) => `${key.modelCode}::${key.spareCode}`)
  );

  if (keys.length === 0) return;

  const modelCodes = unique(keys.map((key) => key.split("::")[0]));
  const spareCodes = unique(keys.map((key) => key.split("::")[1]));

  const { data, error } = await supabaseAdmin
    .schema("warehouse")
    .from("vehicle_spare_inventory")
    .select("model_code, spare_code, status")
    .in("model_code", modelCodes)
    .in("spare_code", spareCodes);

  if (error) throw new Error(error.message);

  for (const key of keys) {
    const [modelCode, spareCode] = key.split("::");
    const rows = (data ?? []).filter(
      (row) => row.model_code === modelCode && row.spare_code === spareCode
    );
    const arrivedQuantity = rows.length;
    const warehouseQuantity = rows.filter((row) => row.status !== "ISSUED").length;

    const { error: updateError } = await supabaseAdmin
      .schema("warehouse")
      .from("vehicle_spare_codes")
      .update({
        arrived_quantity: arrivedQuantity,
        warehouse_quantity: warehouseQuantity,
      })
      .eq("model_code", modelCode)
      .eq("spare_code", spareCode);

    if (updateError) throw new Error(updateError.message);
  }
}

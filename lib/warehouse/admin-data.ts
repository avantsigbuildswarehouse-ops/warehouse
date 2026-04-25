import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";

type VehicleInventoryRow = {
  model_code: string;
  engine_number: string;
  chassis_number: string;
  color: string;
  yom: string;
  version: string;
  status: string;
  price: number | string | null;
};

type VehicleModelRow = {
  model_code: string;
  model_name: string;
  price: number | string | null;
  arrived_quantity: number | null;
  warehouse_quantity: number | null;
};

type SpareInventoryRow = {
  model_code: string;
  spare_code: string;
  serial_number: string;
};

type SpareCodeRow = {
  model_code: string;
  spare_code: string;
  spare_name: string;
  price: number | string | null;
  arrived_quantity: number | null;
  warehouse_quantity: number | null;
};

function toNumber(value: number | string | null | undefined) {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value) || 0;
  return 0;
}

export async function getVehicleModels() {
  const { data, error } = await supabaseAdmin
    .schema("warehouse")
    .from("vehicle_model_codes")
    .select("model_code, model_name, price, arrived_quantity, warehouse_quantity")
    .order("model_name");

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as VehicleModelRow[];
}

export async function getVehicleInventoryDetails() {
  const { data, error } = await supabaseAdmin
    .schema("warehouse")
    .from("vehicle_inventory")
    .select(
      "model_code, engine_number, chassis_number, color, yom, version, status, price"
    )
    .order("model_code")
    .order("engine_number");

  if (error) {
    throw new Error(error.message);
  }

  const inventory = (data ?? []) as VehicleInventoryRow[];
  const models = await getVehicleModels();
  const modelMap = new Map(models.map((model) => [model.model_code, model]));

  const items = inventory.map((item) => {
    const model = modelMap.get(item.model_code);
    const price = toNumber(item.price ?? model?.price);

    return {
      ...item,
      price,
      model_name: model?.model_name ?? item.model_code,
      model_quantity: model?.arrived_quantity ?? 0,
    };
  });

  return {
    summary: {
      totalUnits: items.length,
      totalModels: new Set(items.map((item) => item.model_code)).size,
      totalValue: items.reduce((sum, item) => sum + item.price, 0),
    },
    items,
  };
}

export async function getSpareCodes(modelCode?: string) {
  let query = supabaseAdmin
    .schema("warehouse")
    .from("vehicle_spare_codes")
    .select("model_code, spare_code, spare_name, price, arrived_quantity, warehouse_quantity")
    .order("spare_name");

  if (modelCode) {
    query = query.eq("model_code", modelCode);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as SpareCodeRow[];
}

export async function getSpareInventoryDetails() {
  const { data, error } = await supabaseAdmin
    .schema("warehouse")
    .from("vehicle_spare_inventory")
    .select("model_code, spare_code, serial_number, status")
    .order("model_code")
    .order("spare_code")
    .order("serial_number");

  if (error) {
    throw new Error(error.message);
  }

  const inventory = (data ?? []) as SpareInventoryRow[];
  const [models, spareCodes] = await Promise.all([
    getVehicleModels(),
    getSpareCodes(),
  ]);

  const modelMap = new Map(models.map((model) => [model.model_code, model]));
  const spareMap = new Map(
    spareCodes.map((spare) => [spare.spare_code, spare] as const)
  );

  const items = inventory.map((item) => {
    const model = modelMap.get(item.model_code);
    const spare = spareMap.get(item.spare_code);

    return {
      ...item,
      price: toNumber(spare?.price),
      model_name: model?.model_name ?? item.model_code,
      spare_name: spare?.spare_name ?? item.spare_code,
      warehouse_quantity: spare?.warehouse_quantity ?? 0,
      arrived_quantity: spare?.arrived_quantity ?? 0,
    };
  });

  return {
    summary: {
      totalUnits: items.length,
      totalSpareTypes: new Set(items.map((item) => item.spare_code)).size,
      totalValue: items.reduce((sum, item) => sum + item.price, 0),
    },
    items,
  };
}

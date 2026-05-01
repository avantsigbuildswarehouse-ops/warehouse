import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { getSpareInventoryDetails, getVehicleInventoryDetails, getVehicleModels } from "@/lib/warehouse/admin-data";

type InventoryVehicleRow = {
  id: string;
  model_code: string;
  engine_number: string;
  chassis_number: string;
  color: string | null;
  yom: string | null;
  version: string | null;
  price: number | string | null;
  issued_at: string | null;
  sold_at: string | null;
};

type InventorySpareRow = {
  id: string;
  model_code: string;
  spare_code: string;
  serial_number: string;
  price: number | string | null;
  issued_at: string | null;
  sold_at: string | null;
};

type SalesOrderRow = {
  id: string;
  buyer_type: "customer" | "company";
  target_type: "dealer" | "showroom";
  target_code: string;
  total: number | string | null;
  created_at: string | null;
};

type SaleItemRow = {
  sale_id: string;
  item_type: "Bike" | "Spare";
  inventory_id: string;
};

type ProfileRow = {
  role: string | null;
  code: string | null;
};

export type PartnerAnalyticsData = {
  targetType: "dealer" | "showroom";
  targetCode: string;
  totals: {
    bikesSold: number;
    sparesSold: number;
    bikeSalesValue: number;
    spareSalesValue: number;
    bikeInventoryUnits: number;
    spareInventoryUnits: number;
    bikeInventoryValue: number;
    spareInventoryValue: number;
  };
  soldVehicles: Array<{
    key: string;
    modelCode: string;
    engineNumber: string;
    chassisNumber: string;
    color: string | null;
    soldValue: number;
    soldAt: string | null;
    source: "Customer" | "Company";
  }>;
  soldSpares: Array<{
    key: string;
    modelCode: string;
    spareCode: string;
    serialNumber: string;
    soldValue: number;
    soldAt: string | null;
    source: "Customer" | "Company";
  }>;
  vehicleInventory: InventoryVehicleRow[];
  spareInventory: InventorySpareRow[];
};

export type AdminAnalyticsData = {
  totals: {
    totalDealers: number;
    totalShowrooms: number;
    warehouseVehicleUnits: number;
    warehouseSpareUnits: number;
    assignedDealerVehicles: number;
    assignedDealerSpares: number;
    assignedShowroomVehicles: number;
    assignedShowroomSpares: number;
    totalBikesSold: number;
    totalSparesSold: number;
    totalSalesValue: number;
    warehouseVehicleValue: number;
    warehouseSpareValue: number;
  };
  recentSales: Array<{
    saleId: string;
    buyerType: "customer" | "company";
    targetType: "dealer" | "showroom";
    targetCode: string;
    total: number;
    createdAt: string | null;
    bikeCount: number;
    spareCount: number;
  }>;
  topPartners: Array<{
    targetType: "dealer" | "showroom";
    targetCode: string;
    salesValue: number;
    salesCount: number;
  }>;
  vehicleModels: Awaited<ReturnType<typeof getVehicleModels>>;
};

function toNumber(value: number | string | null | undefined) {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value) || 0;
  return 0;
}

function sortByNewest<T extends { soldAt: string | null }>(items: T[]) {
  return items.sort((a, b) => {
    if (!a.soldAt && !b.soldAt) return 0;
    if (!a.soldAt) return 1;
    if (!b.soldAt) return -1;
    return a.soldAt < b.soldAt ? 1 : -1;
  });
}

export async function getPartnerAnalytics(
  targetType: "dealer" | "showroom",
  targetCode: string
): Promise<PartnerAnalyticsData> {
  const schema = "ASB showrooms";
  const vehicleTable =
    targetType === "dealer" ? "dealer_vehicle_inventory" : "showroom_vehicle_inventory";
  const spareTable =
    targetType === "dealer" ? "dealer_spare_inventory" : "showroom_spare_inventory";
  const codeField = targetType === "dealer" ? "dealer_code" : "showroom_code";

  const [vehicleResult, spareResult, salesResult, saleItemsResult] = await Promise.all([
    supabaseAdmin
      .schema(schema)
      .from(vehicleTable)
      .select(
        "id, model_code, engine_number, chassis_number, color, yom, version, price, issued_at, sold_at"
      )
      .eq(codeField, targetCode)
      .order("issued_at", { ascending: false }),
    supabaseAdmin
      .schema(schema)
      .from(spareTable)
      .select("id, model_code, spare_code, serial_number, price, issued_at, sold_at")
      .eq(codeField, targetCode)
      .order("issued_at", { ascending: false }),
    supabaseAdmin
      .from("sales_orders")
      .select("id, buyer_type, target_type, target_code, total, created_at")
      .eq("target_type", targetType)
      .eq("target_code", targetCode)
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("sales_order_items")
      .select("sale_id, item_type, inventory_id"),
  ]);

  if (vehicleResult.error) throw new Error(vehicleResult.error.message);
  if (spareResult.error) throw new Error(spareResult.error.message);
  if (salesResult.error) throw new Error(salesResult.error.message);
  if (saleItemsResult.error) throw new Error(saleItemsResult.error.message);

  const vehicleInventory = (vehicleResult.data ?? []) as InventoryVehicleRow[];
  const spareInventory = (spareResult.data ?? []) as InventorySpareRow[];
  const sales = (salesResult.data ?? []) as SalesOrderRow[];
  const saleItems = (saleItemsResult.data ?? []) as SaleItemRow[];

  const vehicleById = new Map(vehicleInventory.map((vehicle) => [vehicle.id, vehicle]));
  const spareById = new Map(spareInventory.map((spare) => [spare.id, spare]));
  const saleMap = new Map(sales.map((sale) => [sale.id, sale]));

  const soldVehicles = sortByNewest(
    saleItems
      .filter((item) => item.item_type === "Bike")
      .map((item) => {
        const sale = saleMap.get(item.sale_id);
        const vehicle = vehicleById.get(item.inventory_id);
        if (!sale || !vehicle) return null;
        return {
          key: vehicle.id,
          modelCode: vehicle.model_code,
          engineNumber: vehicle.engine_number,
          chassisNumber: vehicle.chassis_number,
          color: vehicle.color,
          soldValue: toNumber(sale.total),
          soldAt: vehicle.sold_at ?? sale.created_at,
          source: sale.buyer_type === "customer" ? ("Customer" as const) : ("Company" as const),
        };
      })
      .filter((value): value is NonNullable<typeof value> => Boolean(value))
  );

  const soldSpares = sortByNewest(
    saleItems
      .filter((item) => item.item_type === "Spare")
      .map((item) => {
        const sale = saleMap.get(item.sale_id);
        const spare = spareById.get(item.inventory_id);
        if (!sale || !spare) return null;
        return {
          key: spare.id,
          modelCode: spare.model_code,
          spareCode: spare.spare_code,
          serialNumber: spare.serial_number,
          soldValue: toNumber(sale.total),
          soldAt: spare.sold_at ?? sale.created_at,
          source: sale.buyer_type === "customer" ? ("Customer" as const) : ("Company" as const),
        };
      })
      .filter((value): value is NonNullable<typeof value> => Boolean(value))
  );

  return {
    targetType,
    targetCode,
    totals: {
      bikesSold: soldVehicles.length,
      sparesSold: soldSpares.length,
      bikeSalesValue: soldVehicles.reduce((sum, item) => sum + item.soldValue, 0),
      spareSalesValue: soldSpares.reduce((sum, item) => sum + item.soldValue, 0),
      bikeInventoryUnits: vehicleInventory.length,
      spareInventoryUnits: spareInventory.length,
      bikeInventoryValue: vehicleInventory.reduce((sum, item) => sum + toNumber(item.price), 0),
      spareInventoryValue: spareInventory.reduce((sum, item) => sum + toNumber(item.price), 0),
    },
    soldVehicles,
    soldSpares,
    vehicleInventory,
    spareInventory,
  };
}

export async function getAdminAnalytics(): Promise<AdminAnalyticsData> {
  const schema = "ASB showrooms";

  const [
    profilesResult,
    dealerVehiclesResult,
    dealerSparesResult,
    showroomVehiclesResult,
    showroomSparesResult,
    salesResult,
    saleItemsResult,
    warehouseVehicles,
    warehouseSpares,
    vehicleModels,
  ] = await Promise.all([
    supabaseAdmin.from("profiles").select("role, code"),
    supabaseAdmin.schema(schema).from("dealer_vehicle_inventory").select("id, sold_at"),
    supabaseAdmin.schema(schema).from("dealer_spare_inventory").select("id, sold_at"),
    supabaseAdmin.schema(schema).from("showroom_vehicle_inventory").select("id, sold_at"),
    supabaseAdmin.schema(schema).from("showroom_spare_inventory").select("id, sold_at"),
    supabaseAdmin
      .from("sales_orders")
      .select("id, buyer_type, target_type, target_code, total, created_at")
      .order("created_at", { ascending: false }),
    supabaseAdmin.from("sales_order_items").select("sale_id, item_type, inventory_id"),
    getVehicleInventoryDetails(),
    getSpareInventoryDetails(),
    getVehicleModels(),
  ]);

  if (profilesResult.error) throw new Error(profilesResult.error.message);
  if (dealerVehiclesResult.error) throw new Error(dealerVehiclesResult.error.message);
  if (dealerSparesResult.error) throw new Error(dealerSparesResult.error.message);
  if (showroomVehiclesResult.error) throw new Error(showroomVehiclesResult.error.message);
  if (showroomSparesResult.error) throw new Error(showroomSparesResult.error.message);
  if (salesResult.error) throw new Error(salesResult.error.message);
  if (saleItemsResult.error) throw new Error(saleItemsResult.error.message);

  const profiles = (profilesResult.data ?? []) as ProfileRow[];
  const sales = (salesResult.data ?? []) as SalesOrderRow[];
  const saleItems = (saleItemsResult.data ?? []) as SaleItemRow[];

  const dealerCodes = new Set(
    profiles
      .filter((profile) => profile.role === "dealer-admin" && profile.code)
      .map((profile) => profile.code as string)
  );
  const showroomCodes = new Set(
    profiles
      .filter((profile) => profile.role === "showroom-admin" && profile.code)
      .map((profile) => profile.code as string)
  );

  const itemsBySaleId = new Map<string, { bikeCount: number; spareCount: number }>();
  for (const item of saleItems) {
    const current = itemsBySaleId.get(item.sale_id) ?? { bikeCount: 0, spareCount: 0 };
    if (item.item_type === "Bike") current.bikeCount += 1;
    if (item.item_type === "Spare") current.spareCount += 1;
    itemsBySaleId.set(item.sale_id, current);
  }

  const recentSales = sales.slice(0, 8).map((sale) => {
    const counts = itemsBySaleId.get(sale.id) ?? { bikeCount: 0, spareCount: 0 };
    return {
      saleId: sale.id,
      buyerType: sale.buyer_type,
      targetType: sale.target_type,
      targetCode: sale.target_code,
      total: toNumber(sale.total),
      createdAt: sale.created_at,
      bikeCount: counts.bikeCount,
      spareCount: counts.spareCount,
    };
  });

  const topPartnerMap = new Map<string, { targetType: "dealer" | "showroom"; targetCode: string; salesValue: number; salesCount: number }>();
  for (const sale of sales) {
    const key = `${sale.target_type}:${sale.target_code}`;
    const current = topPartnerMap.get(key) ?? {
      targetType: sale.target_type,
      targetCode: sale.target_code,
      salesValue: 0,
      salesCount: 0,
    };
    current.salesValue += toNumber(sale.total);
    current.salesCount += 1;
    topPartnerMap.set(key, current);
  }

  const totalBikesSold = saleItems.filter((item) => item.item_type === "Bike").length;
  const totalSparesSold = saleItems.filter((item) => item.item_type === "Spare").length;

  return {
    totals: {
      totalDealers: dealerCodes.size,
      totalShowrooms: showroomCodes.size,
      warehouseVehicleUnits: warehouseVehicles.summary.totalUnits,
      warehouseSpareUnits: warehouseSpares.summary.totalUnits,
      assignedDealerVehicles: (dealerVehiclesResult.data ?? []).length,
      assignedDealerSpares: (dealerSparesResult.data ?? []).length,
      assignedShowroomVehicles: (showroomVehiclesResult.data ?? []).length,
      assignedShowroomSpares: (showroomSparesResult.data ?? []).length,
      totalBikesSold,
      totalSparesSold,
      totalSalesValue: sales.reduce((sum, sale) => sum + toNumber(sale.total), 0),
      warehouseVehicleValue: warehouseVehicles.summary.totalValue,
      warehouseSpareValue: warehouseSpares.summary.totalValue,
    },
    recentSales,
    topPartners: Array.from(topPartnerMap.values()).sort((a, b) => b.salesValue - a.salesValue).slice(0, 8),
    vehicleModels,
  };
}

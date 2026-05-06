import { getSupabaseAdmin } from "@/lib/supabase/admin";

const supabaseAdmin = getSupabaseAdmin();

type BuyerType = "customer" | "company";
type TargetType = "dealer" | "showroom";

type SalesOrderRow = {
  id: string;
  created_at: string | null;
  buyer_type: BuyerType;
  customer_id: string | null;
  company_id: string | null;
  target_type: TargetType;
  target_code: string;
  base_price: number | string | null;
  registration_fee: number | string | null;
  discount: number | string | null;
  advance_payment: number | string | null;
  balance_due: number | string | null;
  payment_method: string | null;
  total: number | string | null;
};

type SaleItemRow = {
  sale_id: string;
  item_type: "Bike" | "Spare";
  inventory_id: string;
};

type InventoryVehicleRow = {
  id: string;
  model_code: string;
  engine_number: string;
  chassis_number: string;
  color: string | null;
  yom: string | null;
  version: string | null;
  price: number | string | null;
  sold_at: string | null;
};

type InventorySpareRow = {
  id: string;
  model_code: string;
  spare_code: string;
  serial_number: string;
  price: number | string | null;
  sold_at: string | null;
};

type CustomerRow = {
  id: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  address: string | null;
  nic: string | null;
};

type CompanyRow = {
  id: string;
  company_name: string;
  company_email: string;
  company_contact: string | null;
  address: string | null;
  BR_no: string | null;
  VAT_no: string | null;
};

export type SaleHistoryItem = {
  inventoryId: string;
  type: "Bike" | "Spare";
  modelCode: string;
  price: number;
  identifier: string;
  engineNumber: string | null;
  chassisNumber: string | null;
  color: string | null;
  yom: string | null;
  version: string | null;
  spareCode: string | null;
  serialNumber: string | null;
  soldAt: string | null;
};

export type SaleHistoryCustomer = {
  id: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  address: string | null;
  nic: string | null;
};

export type SaleHistoryCompany = {
  id: string;
  companyName: string;
  companyEmail: string;
  companyContact: string | null;
  address: string | null;
  brNo: string | null;
  vatNo: string | null;
};

export type SaleHistoryGroup = {
  id: string;
  buyerType: BuyerType;
  targetType: TargetType;
  targetCode: string;
  createdAt: string | null;
  basePrice: number;
  registrationFee: number;
  discount: number;
  advancePayment: number;
  balanceDue: number;
  total: number;
  paymentMethod: string;
  items: SaleHistoryItem[];
  customer: SaleHistoryCustomer | null;
  company: SaleHistoryCompany | null;
};

export type SalesHistoryData = {
  buyerType: BuyerType;
  targetType: TargetType;
  targetCode: string;
  groups: SaleHistoryGroup[];
  stats: {
    soldVehicles: number;
    soldSpares: number;
    totalRevenue: number;
    uniqueBuyers: number;
    lastSale: string | null;
  };
};

function toNumber(value: number | string | null | undefined) {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value) || 0;
  return 0;
}

export async function getSalesHistoryData({
  buyerType,
  targetType,
  targetCode,
}: {
  buyerType: BuyerType;
  targetType: TargetType;
  targetCode: string;
}): Promise<SalesHistoryData> {
  const schema = "ASB showrooms";
  const vehicleTable =
    targetType === "dealer" ? "dealer_vehicle_inventory" : "showroom_vehicle_inventory";
  const spareTable =
    targetType === "dealer" ? "dealer_spare_inventory" : "showroom_spare_inventory";
  const codeField = targetType === "dealer" ? "dealer_code" : "showroom_code";

  const salesResult = await supabaseAdmin
    .from("sales_orders")
    .select(
      "id, created_at, buyer_type, customer_id, company_id, target_type, target_code, base_price, registration_fee, discount, advance_payment, balance_due, payment_method, total"
    )
    .eq("buyer_type", buyerType)
    .eq("target_type", targetType)
    .eq("target_code", targetCode)
    .order("created_at", { ascending: false });

  if (salesResult.error) {
    throw new Error(salesResult.error.message);
  }

  const sales = (salesResult.data ?? []) as SalesOrderRow[];
  const saleIds = sales.map((sale) => sale.id);

  if (saleIds.length === 0) {
    return {
      buyerType,
      targetType,
      targetCode,
      groups: [],
      stats: {
        soldVehicles: 0,
        soldSpares: 0,
        totalRevenue: 0,
        uniqueBuyers: 0,
        lastSale: null,
      },
    };
  }

  const saleItemsResult = await supabaseAdmin
    .from("sales_order_items")
    .select("sale_id, item_type, inventory_id")
    .in("sale_id", saleIds);

  if (saleItemsResult.error) {
    throw new Error(saleItemsResult.error.message);
  }

  const saleItems = (saleItemsResult.data ?? []) as SaleItemRow[];
  const bikeIds = saleItems.filter((item) => item.item_type === "Bike").map((item) => item.inventory_id);
  const spareIds = saleItems.filter((item) => item.item_type === "Spare").map((item) => item.inventory_id);

  const [vehicleResult, spareResult] = await Promise.all([
    bikeIds.length
      ? supabaseAdmin
          .schema(schema)
          .from(vehicleTable)
          .select("id, model_code, engine_number, chassis_number, color, yom, version, price, sold_at")
          .eq(codeField, targetCode)
          .in("id", bikeIds)
      : Promise.resolve({ data: [], error: null }),
    spareIds.length
      ? supabaseAdmin
          .schema(schema)
          .from(spareTable)
          .select("id, model_code, spare_code, serial_number, price, sold_at")
          .eq(codeField, targetCode)
          .in("id", spareIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (vehicleResult.error) {
    throw new Error(vehicleResult.error.message);
  }
  if (spareResult.error) {
    throw new Error(spareResult.error.message);
  }

  const customerIds = sales.map((sale) => sale.customer_id).filter((value): value is string => Boolean(value));
  const companyIds = sales.map((sale) => sale.company_id).filter((value): value is string => Boolean(value));

  const [customersResult, companiesResult] = await Promise.all([
    buyerType === "customer" && customerIds.length
      ? supabaseAdmin
          .from("Customers")
          .select("id, first_name, last_name, phone_number, address, nic")
          .in("id", Array.from(new Set(customerIds)))
      : Promise.resolve({ data: [], error: null }),
    buyerType === "company" && companyIds.length
      ? supabaseAdmin
          .from("Companies")
          .select('id, company_name, company_email, company_contact, address, "BR_no", "VAT_no"')
          .in("id", Array.from(new Set(companyIds)))
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (customersResult.error) {
    throw new Error(customersResult.error.message);
  }
  if (companiesResult.error) {
    throw new Error(companiesResult.error.message);
  }

  const vehicleById = new Map(
    ((vehicleResult.data ?? []) as InventoryVehicleRow[]).map((vehicle) => [vehicle.id, vehicle])
  );
  const spareById = new Map(
    ((spareResult.data ?? []) as InventorySpareRow[]).map((spare) => [spare.id, spare])
  );
  const customerById = new Map(
    ((customersResult.data ?? []) as CustomerRow[]).map((customer) => [customer.id, customer])
  );
  const companyById = new Map(
    ((companiesResult.data ?? []) as CompanyRow[]).map((company) => [company.id, company])
  );

  const itemsBySaleId = new Map<string, SaleHistoryItem[]>();
  for (const item of saleItems) {
    const current = itemsBySaleId.get(item.sale_id) ?? [];

    if (item.item_type === "Bike") {
      const vehicle = vehicleById.get(item.inventory_id);
      if (vehicle) {
        current.push({
          inventoryId: vehicle.id,
          type: "Bike",
          modelCode: vehicle.model_code,
          price: toNumber(vehicle.price),
          identifier: vehicle.chassis_number || vehicle.engine_number || vehicle.id,
          engineNumber: vehicle.engine_number,
          chassisNumber: vehicle.chassis_number,
          color: vehicle.color,
          yom: vehicle.yom,
          version: vehicle.version,
          spareCode: null,
          serialNumber: null,
          soldAt: vehicle.sold_at,
        });
      }
    } else {
      const spare = spareById.get(item.inventory_id);
      if (spare) {
        current.push({
          inventoryId: spare.id,
          type: "Spare",
          modelCode: spare.model_code,
          price: toNumber(spare.price),
          identifier: spare.serial_number || spare.spare_code || spare.id,
          engineNumber: null,
          chassisNumber: null,
          color: null,
          yom: null,
          version: null,
          spareCode: spare.spare_code,
          serialNumber: spare.serial_number,
          soldAt: spare.sold_at,
        });
      }
    }

    itemsBySaleId.set(item.sale_id, current);
  }

  const groups = sales
    .map((sale) => {
    const customer = sale.customer_id ? customerById.get(sale.customer_id) ?? null : null;
    const company = sale.company_id ? companyById.get(sale.company_id) ?? null : null;

    return {
      id: sale.id,
      buyerType: sale.buyer_type,
      targetType: sale.target_type,
      targetCode: sale.target_code,
      createdAt: sale.created_at,
      basePrice: toNumber(sale.base_price),
      registrationFee: toNumber(sale.registration_fee),
      discount: toNumber(sale.discount),
      advancePayment: toNumber(sale.advance_payment),
      balanceDue: toNumber(sale.balance_due),
      total: toNumber(sale.total),
      paymentMethod: sale.payment_method || "-",
      items: itemsBySaleId.get(sale.id) ?? [],
      customer: customer
        ? {
            id: customer.id,
            firstName: customer.first_name,
            lastName: customer.last_name,
            phoneNumber: customer.phone_number,
            address: customer.address,
            nic: customer.nic,
          }
        : null,
      company: company
        ? {
            id: company.id,
            companyName: company.company_name,
            companyEmail: company.company_email,
            companyContact: company.company_contact,
            address: company.address,
            brNo: company.BR_no,
            vatNo: company.VAT_no,
          }
        : null,
    } satisfies SaleHistoryGroup;
    })
    .filter((group) => group.items.length > 0);

  return {
    buyerType,
    targetType,
    targetCode,
    groups,
    stats: {
      soldVehicles: groups.reduce(
        (count, group) => count + group.items.filter((item) => item.type === "Bike").length,
        0
      ),
      soldSpares: groups.reduce(
        (count, group) => count + group.items.filter((item) => item.type === "Spare").length,
        0
      ),
      totalRevenue: groups.reduce((sum, group) => sum + group.total, 0),
      uniqueBuyers: new Set(
        groups
          .map((group) => (group.buyerType === "customer" ? group.customer?.id : group.company?.id))
          .filter(Boolean)
      ).size,
      lastSale: groups.map((group) => group.createdAt).find(Boolean) ?? null,
    },
  };
}

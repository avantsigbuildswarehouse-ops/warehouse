import { getSupabaseAdmin } from "@/lib/supabase/admin";

const supabaseAdmin = getSupabaseAdmin();

type BuyerType = "customer" | "company";
type TargetType = "dealer" | "showroom";

type CustomerPayload = {
  first_name: string;
  last_name: string;
  phone_number: string;
  address?: string | null;
  nic?: string | null;
};

type CompanyPayload = {
  company_name: string;
  company_email: string;
  company_contact?: string | null;
  address?: string | null;
  br_no?: string | null;
  vat_no?: string | null;
};

type PaymentPayload = {
  base_price: number;
  registration_fee: number;
  discount: number;
  advance_payment: number;
  payment_method: string;
};

type VehicleInventoryRow = {
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

type SalesOrderRow = {
  id: string;
  created_at: string;
  customer_id: string | null;
  company_id: string | null;
  target_type: TargetType;
  target_code: string;
  base_price: number | string;
  registration_fee: number | string;
  discount: number | string;
  advance_payment: number | string;
  balance_due: number | string;
  payment_method: string;
  total: number | string;
};

type VehicleModelRow = {
  model_code: string;
  model_name: string;
  price: number | string | null;
  warehouse_quantity: number | null;
};

function toNumber(value: number | string | null | undefined) {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value) || 0;
  return 0;
}

function getInventoryTable(targetType: TargetType) {
  return {
    schema: "ASB showrooms",
    vehicleTable: targetType === "dealer" ? "dealer_vehicle_inventory" : "showroom_vehicle_inventory",
    codeField: targetType === "dealer" ? "dealer_code" : "showroom_code",
  };
}

export async function getWarehouseVehicleModels() {
  const { data, error } = await supabaseAdmin
    .schema("warehouse")
    .from("vehicle_model_codes")
    .select("model_code, model_name, price, warehouse_quantity")
    .order("model_name");

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as VehicleModelRow[]).map((row) => ({
    model_code: row.model_code,
    model_name: row.model_name,
    price: toNumber(row.price),
    warehouse_quantity: row.warehouse_quantity ?? 0,
  }));
}

export async function createAdvanceBooking({
  buyerType,
  targetType,
  targetCode,
  requestedModel,
  payment,
  customer,
  company,
}: {
  buyerType: BuyerType;
  targetType: TargetType;
  targetCode: string;
  requestedModel: { model_code: string; model_name: string; price: number };
  payment: PaymentPayload;
  customer?: CustomerPayload;
  company?: CompanyPayload;
}) {
  let customerId: string | null = null;
  let companyId: string | null = null;
  let buyerData: CustomerPayload | CompanyPayload | null = null;

  if (buyerType === "customer") {
    if (!customer) throw new Error("Missing customer details");
    const { data, error } = await supabaseAdmin
      .from("Customers")
      .insert({
        first_name: customer.first_name,
        last_name: customer.last_name,
        phone_number: customer.phone_number,
        address: customer.address ?? null,
        nic: customer.nic ?? null,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    customerId = data.id;
    buyerData = customer;
  } else {
    if (!company) throw new Error("Missing company details");
    const { data, error } = await supabaseAdmin
      .from("Companies")
      .insert({
        company_name: company.company_name,
        company_email: company.company_email,
        company_contact: company.company_contact ?? null,
        address: company.address ?? null,
        BR_no: company.br_no ?? null,
        VAT_no: company.vat_no ?? null,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    companyId = data.id;
    buyerData = company;
  }

  const base = toNumber(payment.base_price || requestedModel.price);
  const reg = toNumber(payment.registration_fee);
  const disc = toNumber(payment.discount);
  const adv = toNumber(payment.advance_payment);
  const total = base + reg - disc;
  const balance = total - adv;

  const { data: sale, error: saleError } = await supabaseAdmin
    .from("sales_orders")
    .insert({
      buyer_type: buyerType,
      customer_id: customerId,
      company_id: companyId,
      target_type: targetType,
      target_code: targetCode,
      base_price: base,
      registration_fee: reg,
      discount: disc,
      advance_payment: adv,
      balance_due: balance,
      payment_method: payment.payment_method,
      total,
    })
    .select()
    .single();

  if (saleError) throw new Error(saleError.message);

  return {
    sale,
    buyerId: buyerType === "customer" ? customerId : companyId,
    requestedModel,
    buyerData,
  };
}

export async function findAdvanceBooking({
  buyerType,
  targetType,
  targetCode,
  documentSuffix,
}: {
  buyerType: BuyerType;
  targetType: TargetType;
  targetCode: string;
  documentSuffix: string;
}) {
  const tableName = buyerType === "customer" ? "customer_documents" : "company_documents";
  const { data: docs, error } = await supabaseAdmin
    .from(tableName)
    .select("*")
    .eq("document_type", "invoice")
    .ilike("document_number", `%${documentSuffix}`)
    .order("generated_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const matchedDoc = (docs ?? []).find((doc) => {
    const data = doc.document_data as Record<string, unknown>;
    return (
      data?.sale_stage === "advance" &&
      data?.target_type === targetType &&
      data?.target_code === targetCode
    );
  });

  if (!matchedDoc) {
    return null;
  }

  const documentData = matchedDoc.document_data as Record<string, unknown>;
  const saleId = String(documentData.group_key || "");
  if (!saleId) {
    throw new Error("Advance booking is missing sale reference");
  }

  const { data: sale, error: saleError } = await supabaseAdmin
    .from("sales_orders")
    .select("*")
    .eq("id", saleId)
    .single();

  if (saleError) {
    throw new Error(saleError.message);
  }

  const { data: existingItems, error: itemsError } = await supabaseAdmin
    .from("sales_order_items")
    .select("id")
    .eq("sale_id", saleId)
    .limit(1);

  if (itemsError) {
    throw new Error(itemsError.message);
  }

  const requestedModelCode = String(documentData.requested_model_code || "");
  const requestedModelName = String(documentData.requested_model_name || requestedModelCode);
  const requestedPrice = toNumber(documentData.requested_price as number | string | null | undefined);

  const { schema, vehicleTable, codeField } = getInventoryTable(targetType);
  const { data: vehicles, error: vehiclesError } = await supabaseAdmin
    .schema(schema)
    .from(vehicleTable)
    .select("id, model_code, engine_number, chassis_number, color, yom, version, price, sold_at")
    .eq(codeField, targetCode)
    .eq("model_code", requestedModelCode)
    .is("sold_at", null)
    .order("issued_at", { ascending: false });

  if (vehiclesError) {
    throw new Error(vehiclesError.message);
  }

  return {
    sale: sale as SalesOrderRow,
    documentNumber: matchedDoc.document_number as string,
    buyerType,
    targetType,
    targetCode,
    requestedModel: {
      model_code: requestedModelCode,
      model_name: requestedModelName,
      price: requestedPrice,
    },
    buyer:
      buyerType === "customer"
        ? (documentData.customer as Record<string, unknown>)
        : (documentData.company as Record<string, unknown>),
    alreadyCollected: (existingItems ?? []).length > 0,
    availableVehicles: ((vehicles ?? []) as VehicleInventoryRow[]).map((vehicle) => ({
      id: vehicle.id,
      model_code: vehicle.model_code,
      engine_number: vehicle.engine_number,
      chassis_number: vehicle.chassis_number,
      color: vehicle.color,
      yom: vehicle.yom,
      version: vehicle.version,
      price: toNumber(vehicle.price),
    })),
  };
}

export async function finalizeAdvanceBooking({
  buyerType,
  targetType,
  targetCode,
  saleId,
  vehicleId,
  payment,
}: {
  buyerType: BuyerType;
  targetType: TargetType;
  targetCode: string;
  saleId: string;
  vehicleId: string;
  payment: PaymentPayload;
}) {
  const { data: sale, error: saleError } = await supabaseAdmin
    .from("sales_orders")
    .select("*")
    .eq("id", saleId)
    .eq("buyer_type", buyerType)
    .eq("target_type", targetType)
    .eq("target_code", targetCode)
    .single();

  if (saleError) throw new Error(saleError.message);

  const { data: existingItems, error: itemsError } = await supabaseAdmin
    .from("sales_order_items")
    .select("id")
    .eq("sale_id", saleId)
    .limit(1);

  if (itemsError) throw new Error(itemsError.message);
  if ((existingItems ?? []).length > 0) {
    throw new Error("This advance booking has already been collected");
  }

  const { schema, vehicleTable, codeField } = getInventoryTable(targetType);
  const { data: vehicle, error: vehicleError } = await supabaseAdmin
    .schema(schema)
    .from(vehicleTable)
    .select("id, model_code, engine_number, chassis_number, color, yom, version, price")
    .eq(codeField, targetCode)
    .eq("id", vehicleId)
    .is("sold_at", null)
    .single();

  if (vehicleError) throw new Error(vehicleError.message);

  const base = toNumber(payment.base_price || vehicle.price);
  const reg = toNumber(payment.registration_fee);
  const disc = toNumber(payment.discount);
  const adv = toNumber(payment.advance_payment);
  const total = base + reg - disc;
  const balance = total - adv;

  const { data: updatedSale, error: updateSaleError } = await supabaseAdmin
    .from("sales_orders")
    .update({
      base_price: base,
      registration_fee: reg,
      discount: disc,
      advance_payment: adv,
      balance_due: balance,
      payment_method: payment.payment_method,
      total,
    })
    .eq("id", saleId)
    .select()
    .single();

  if (updateSaleError) throw new Error(updateSaleError.message);

  const { error: insertItemError } = await supabaseAdmin.from("sales_order_items").insert({
    sale_id: saleId,
    item_type: "Bike",
    inventory_id: vehicleId,
  });

  if (insertItemError) throw new Error(insertItemError.message);

  const soldAt = new Date().toISOString();
  const inventoryUpdatePayload =
    buyerType === "customer"
      ? {
          sold_at: soldAt,
          sale_id: saleId,
          sold_customer_id: sale.customer_id,
          sold_company_id: null,
        }
      : {
          sold_at: soldAt,
          sale_id: saleId,
          sold_customer_id: null,
          sold_company_id: sale.company_id,
        };

  const { error: inventoryUpdateError } = await supabaseAdmin
    .schema(schema)
    .from(vehicleTable)
    .update(inventoryUpdatePayload)
    .eq(codeField, targetCode)
    .eq("id", vehicleId)
    .is("sold_at", null);

  if (inventoryUpdateError) throw new Error(inventoryUpdateError.message);

  return {
    sale: updatedSale as SalesOrderRow,
    vehicle: {
      id: vehicle.id,
      model_code: vehicle.model_code,
      engine_number: vehicle.engine_number,
      chassis_number: vehicle.chassis_number,
      color: vehicle.color,
      yom: vehicle.yom,
      version: vehicle.version,
      price: toNumber(vehicle.price),
    },
  };
}

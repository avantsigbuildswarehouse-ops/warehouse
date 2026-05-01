//;

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireSalesRoute } from "@/lib/auth/require-sales-route";

type SaleItem = { type: "Bike" | "Spare"; id: string };
type SoldBikeRow = {
  id: string;
  engine_number: string | null;
  chassis_number: string | null;
  color: string | null;
};

export async function POST(req: Request) {
  const auth = await requireSalesRoute();
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const targetType = (body?.targetType || "").toLowerCase();
    const targetCode = body?.targetCode as string;
    const customer = body?.customer as {
      first_name: string;
      last_name: string;
      phone_number: string;
      address?: string | null;
      nic?: string | null;
    };
    const items = (body?.items || []) as SaleItem[];
    const payment = body?.payment as {
      base_price: number;
      vat: number;
      registration_fee: number;
      discount: number;
      advance_payment: number;
      payment_method: string;
    };

    if (!["dealer", "showroom"].includes(targetType) || !targetCode) {
      return NextResponse.json({ error: "Invalid targetType/targetCode" }, { status: 400 });
    }
    if (auth.identity.role !== "admin" && auth.identity.code !== targetCode) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!customer?.first_name || !customer?.last_name || !customer?.phone_number) {
      return NextResponse.json({ error: "Missing customer fields" }, { status: 400 });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Select at least one item" }, { status: 400 });
    }
    if (!payment?.payment_method) {
      return NextResponse.json({ error: "Missing payment details" }, { status: 400 });
    }

    const schema = "ASB showrooms";
    const vehicleTable = targetType === "dealer" ? "dealer_vehicle_inventory" : "showroom_vehicle_inventory";
    const spareTable = targetType === "dealer" ? "dealer_spare_inventory" : "showroom_spare_inventory";
    const codeField = targetType === "dealer" ? "dealer_code" : "showroom_code";

    // Create customer
    const { data: customerRow, error: customerErr } = await supabaseAdmin
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
    if (customerErr) return NextResponse.json({ error: customerErr.message }, { status: 500 });

    const base = Number(payment.base_price || 0);
    const vat = Number(payment.vat || 0);
    const reg = Number(payment.registration_fee || 0);
    const disc = Number(payment.discount || 0);
    const adv = Number(payment.advance_payment || 0);
    const total = base + vat + reg - disc;
    const balance = total - adv;

    const { data: sale, error: saleErr } = await supabaseAdmin
      .from("sales_orders")
      .insert({
        buyer_type: "customer",
        customer_id: customerRow.id,
        target_type: targetType,
        target_code: targetCode,
        base_price: base,
        vat,
        registration_fee: reg,
        discount: disc,
        advance_payment: adv,
        balance_due: balance,
        payment_method: payment.payment_method,
        total,
      })
      .select()
      .single();
    if (saleErr) return NextResponse.json({ error: saleErr.message }, { status: 500 });

    const soldAt = new Date().toISOString();
    const bikeIds = items.filter((i) => i.type === "Bike").map((i) => i.id);
    const spareIds = items.filter((i) => i.type === "Spare").map((i) => i.id);

    // Verify inventory items exist + are unsold
    const [bikeRows, spareRows] = await Promise.all([
      bikeIds.length
        ? supabaseAdmin
            .schema(schema)
            .from(vehicleTable)
            .select("id, engine_number, chassis_number, color")
            .eq(codeField, targetCode)
            .in("id", bikeIds)
            .is("sold_at", null)
        : Promise.resolve({ data: [], error: null }),
      spareIds.length
        ? supabaseAdmin.schema(schema).from(spareTable).select("id").eq(codeField, targetCode).in("id", spareIds).is("sold_at", null)
        : Promise.resolve({ data: [], error: null }),
    ]);
    if (bikeRows.error) return NextResponse.json({ error: bikeRows.error.message }, { status: 500 });
    if (spareRows.error) return NextResponse.json({ error: spareRows.error.message }, { status: 500 });

    if ((bikeRows.data?.length || 0) !== bikeIds.length || (spareRows.data?.length || 0) !== spareIds.length) {
      return NextResponse.json({ error: "Some selected items are no longer available" }, { status: 409 });
    }

    const saleItemsPayload = [
      ...bikeIds.map((id) => ({ sale_id: sale.id, item_type: "Bike", inventory_id: id })),
      ...spareIds.map((id) => ({ sale_id: sale.id, item_type: "Spare", inventory_id: id })),
    ];
    const { error: saleItemsErr } = await supabaseAdmin.from("sales_order_items").insert(saleItemsPayload);
    if (saleItemsErr) return NextResponse.json({ error: saleItemsErr.message }, { status: 500 });

    // Mark items as sold
    const [upBikes, upSpares] = await Promise.all([
      bikeIds.length
        ? supabaseAdmin
            .schema(schema)
            .from(vehicleTable)
            .update({ sold_at: soldAt, sale_id: sale.id, sold_customer_id: customerRow.id, sold_company_id: null })
            .eq(codeField, targetCode)
            .in("id", bikeIds)
            .is("sold_at", null)
        : Promise.resolve({ error: null }),
      spareIds.length
        ? supabaseAdmin
            .schema(schema)
            .from(spareTable)
            .update({ sold_at: soldAt, sale_id: sale.id, sold_customer_id: customerRow.id, sold_company_id: null })
            .eq(codeField, targetCode)
            .in("id", spareIds)
            .is("sold_at", null)
        : Promise.resolve({ error: null }),
    ]);
    if (upBikes.error) return NextResponse.json({ error: upBikes.error.message }, { status: 500 });
    if (upSpares.error) return NextResponse.json({ error: upSpares.error.message }, { status: 500 });

    const bikeWarrantyQr = ((bikeRows.data ?? []) as SoldBikeRow[]).map((bike) => {
      const params = new URLSearchParams({
        engine: bike.engine_number ?? "",
        chassis: bike.chassis_number ?? "",
        soldAt,
      });
      return {
        inventoryId: bike.id,
        engine_number: bike.engine_number,
        chassis_number: bike.chassis_number,
        color: bike.color,
        sold_at: soldAt,
        warranty_url: `/warranty/vehicle?${params.toString()}`,
      };
    });

    return NextResponse.json({ success: true, saleId: sale.id, bikeWarrantyQr });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}


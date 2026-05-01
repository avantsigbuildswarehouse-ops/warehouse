
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createBatchReference, createLineReference } from "@/lib/request-reference";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;
type InventoryBikeRow = {
  model_code: string;
  engine_number: string;
  chassis_number: string;
  color: string;
  yom: string | number | null;
  version: string | null;
  price: number | string;
};
type InventorySpareRow = {
  model_code: string;
  spare_code: string;
  serial_number: string;
  price: number | string;
};

export async function POST(req: Request) {
  const supabase = await createClient();

  try {
    const body = await req.json();
    const { dealerCode, itemType, items, remarks } = body;

    if (!dealerCode || !itemType || !Array.isArray(items) || !items.length) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const requestedAt = new Date().toISOString();
    const cleanItems = items.map((x: string) => x.trim());

    if (itemType === "Bike") {
      return handleBikeRequest(supabase, dealerCode, cleanItems, remarks, requestedAt);
    }

    if (itemType === "Spare") {
      return handleSpareRequest(supabase, dealerCode, cleanItems, remarks, requestedAt);
    }

    return NextResponse.json({ error: "Invalid itemType" }, { status: 400 });

  } catch (error: unknown) {
    console.error("Dealer Request Error:", error);
    const message = error instanceof Error ? error.message : "Unexpected server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function handleBikeRequest(
  supabase: SupabaseClient,
  dealerCode: string,
  engineNumbers: string[],
  remarks: string | null,
  requestedAt: string
) {
  const referenceNo = createBatchReference("REQ-DLR-V");

  const { data: bikes, error: fetchErr } = await supabase
    .schema("warehouse")
    .from("vehicle_inventory")
    .select("model_code, engine_number, chassis_number, color, yom, version, price")
    .eq("status", "AVAILABLE")
    .in("engine_number", engineNumbers);

  if (fetchErr) throw new Error(fetchErr.message);
  if (!bikes?.length) throw new Error("No AVAILABLE bikes found");

  const { error: updateErr } = await supabase
    .schema("warehouse")
    .from("vehicle_inventory")
    .update({
      status: "REQUESTED",
      requested_by: dealerCode,
      requested_at: requestedAt,
      request_reference: referenceNo,
    })
    .eq("status", "AVAILABLE")
    .in("engine_number", engineNumbers);

  if (updateErr) throw new Error(updateErr.message);

  const requestPayload = (bikes as InventoryBikeRow[]).map((bike, index: number) => ({
    reference_no: createLineReference(referenceNo, index),
    dealer_code: dealerCode,
    model_code: bike.model_code,
    engine_number: bike.engine_number,
    chassis_number: bike.chassis_number,
    color: bike.color,
    yom: bike.yom,
    version: bike.version,
    price: Number(bike.price),
    status: "PENDING",
    remarks: remarks || null,
    requested_at: requestedAt,
  }));

  const { error: insertErr } = await supabase
    .from("dealer_vehicle_requests")
    .insert(requestPayload);

  if (insertErr) {
    await supabase
      .schema("warehouse")
      .from("vehicle_inventory")
      .update({ status: "AVAILABLE", requested_by: null, requested_at: null, request_reference: null})
      .in("engine_number", engineNumbers)
      .eq("request_reference", referenceNo);
    throw new Error(insertErr.message);
  }

  return NextResponse.json({
    success: true,
    referenceNo,
    itemCount: bikes.length,
    targetName: dealerCode,
  });
}

async function handleSpareRequest(
  supabase: SupabaseClient,
  dealerCode: string,
  serialNumbers: string[],
  remarks: string | null,
  requestedAt: string
) {
  const referenceNo = createBatchReference("REQ-DLR-S");

  const { data: spares, error: fetchErr } = await supabase
    .schema("warehouse")
    .from("vehicle_spare_inventory")
    .select("model_code, spare_code, serial_number, price")
    .eq("status", "AVAILABLE")
    .in("serial_number", serialNumbers);

  if (fetchErr) throw new Error(fetchErr.message);
  if (!spares?.length) throw new Error("No AVAILABLE spares found");

  const { error: updateErr } = await supabase
    .schema("warehouse")
    .from("vehicle_spare_inventory")
    .update({
      status: "REQUESTED",
      requested_by: dealerCode,
      requested_at: requestedAt,
      request_reference: referenceNo,
    })
    .eq("status", "AVAILABLE")
    .in("serial_number", serialNumbers);

  if (updateErr) throw new Error(updateErr.message);

  const requestPayload = (spares as InventorySpareRow[]).map((spare, index: number) => ({
    reference_no: createLineReference(referenceNo, index),
    dealer_code: dealerCode,
    model_code: spare.model_code,
    spare_code: spare.spare_code,
    serial_number: spare.serial_number,
    price: Number(spare.price),
    status: "PENDING",
    remarks: remarks || null,
    requested_at: requestedAt,
  }));

  const { error: insertErr } = await supabase
    .from("dealer_spare_requests")
    .insert(requestPayload);

  if (insertErr) {
    await supabase
      .schema("warehouse")
      .from("vehicle_spare_inventory")
      .update({ status: "AVAILABLE", requested_by: null, requested_at: null, request_reference: null})
      .in("serial_number", serialNumbers)
      .eq("request_reference", referenceNo);
    throw new Error(insertErr.message);
  }

  return NextResponse.json({
    success: true,
    referenceNo,
    itemCount: spares.length,
    targetName: dealerCode,
  });
}
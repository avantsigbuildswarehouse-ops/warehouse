import { NextResponse } from "next/server";
import { requireAdminRoute } from "@/lib/auth/require-admin-route";
import { getVehicleInventoryDetails } from "@/lib/warehouse/admin-data";
import { supabaseAdmin } from "@/lib/supabase/admin";

type BikePayload = {
  engineNumber: string;
  chassisNumber: string;
  color: string;
  yom: string;
  version: string;
};

export async function GET() {
  const authError = await requireAdminRoute();
  if (authError) return authError;

  try {
    const data = await getVehicleInventoryDetails();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to load inventory",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const authError = await requireAdminRoute();
  if (authError) return authError;

  const body = await req.json();

  const model_code = body.modelCode;
  const bikes = body.bikes;

  if (!model_code) {
    return NextResponse.json(
      { error: "Model code missing" },
      { status: 400 }
    );
  }

  if (!bikes || bikes.length === 0) {
    return NextResponse.json(
      { error: "No bikes provided" },
      { status: 400 }
    );
  }

  // get model price
  const { data: model, error: modelError } = await supabaseAdmin
    .schema("warehouse")
    .from("vehicle_model_codes")
    .select("price, quantity")
    .eq("model_code", model_code)
    .single();

  if (modelError || !model) {
    return NextResponse.json(
      { error: "Model not found" },
      { status: 404 }
    );
  }

  // insert vehicles
  const rows = (bikes as BikePayload[]).map((bike) => ({
    model_code,
    engine_number: bike.engineNumber,
    chassis_number: bike.chassisNumber,
    color: bike.color,
    yom: bike.yom,
    version: bike.version,
    price: model.price,
  }));

  const { error: insertError } = await supabaseAdmin
    .schema("warehouse")
    .from("vehicle_inventory")
    .insert(rows);

  if (insertError) {
    return NextResponse.json(
      { error: insertError.message },
      { status: 500 }
    );
  }

  // increment quantity
  const newQty = (model.quantity || 0) + bikes.length;

  const { error: qtyError } = await supabaseAdmin
    .schema("warehouse")
    .from("vehicle_model_codes")
    .update({ quantity: newQty })
    .eq("model_code", model_code);

  if (qtyError) {
    return NextResponse.json(
      { error: qtyError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}

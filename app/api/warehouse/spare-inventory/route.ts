import { NextResponse } from "next/server";
import { requireAdminRoute } from "@/lib/auth/require-admin-route";
import { getSpareInventoryDetails } from "@/lib/warehouse/admin-data";
import { supabaseAdmin } from "@/lib/supabase/admin";

type SparePayload = {
  serialNumber: string;
};

export async function GET() {
  const authError = await requireAdminRoute();
  if (authError) return authError;

  try {
    const data = await getSpareInventoryDetails();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to load spare inventory",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const authError = await requireAdminRoute();
  if (authError) return authError;

  const body = await req.json();

  if (!body.spareCode || !body.modelCode) {
    return NextResponse.json(
      { error: "Missing data" },
      { status: 400 }
    );
  }

  if (!Array.isArray(body.spares)) {
    return NextResponse.json(
      { error: "Invalid spares array" },
      { status: 400 }
    );
  }

  const rows = (body.spares as SparePayload[]).map((spare) => ({
    model_code: body.modelCode,
    spare_code: body.spareCode,
    serial_number: spare.serialNumber,
  }));

  const { error: insertError } = await supabaseAdmin
    .schema("warehouse")
    .from("vehicle_spare_inventory")
    .insert(rows);

  if (insertError) {
    return NextResponse.json(
      { error: insertError.message },
      { status: 500 }
    );
  }

  const { data: spare } = await supabaseAdmin
    .schema("warehouse")
    .from("vehicle_spare_codes")
    .select("quantity")
    .eq("spare_code", body.spareCode)
    .single();

  const newQty = (spare?.quantity || 0) + rows.length;

  const { error: updateError } = await supabaseAdmin
    .schema("warehouse")
    .from("vehicle_spare_codes")
    .update({ quantity: newQty })
    .eq("spare_code", body.spareCode);

  if (updateError) {
    return NextResponse.json(
      { error: updateError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}

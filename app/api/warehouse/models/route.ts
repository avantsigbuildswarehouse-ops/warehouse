// app/api/warehouse/models/route.ts
import { NextResponse } from "next/server";
import { requireAdminRoute } from "@/lib/auth/require-admin-route";
import { getVehicleModels } from "@/lib/warehouse/admin-data";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const supabaseAdmin = getSupabaseAdmin();

export async function GET() {
  const authError = await requireAdminRoute();
  if (authError) return authError;

  try {
    const data = await getVehicleModels();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load models" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const authError = await requireAdminRoute();
  if (authError) return authError;

  const body = await req.json();

  const name = body.model_name;
  const price = body.price;

  if (!name || !price) {
    return NextResponse.json(
      { error: "Name and price required" },
      { status: 400 }
    );
  }

  const code =
    name.substring(0, 3).toUpperCase() +
    "-" +
    Math.floor(1000 + Math.random() * 9000);

  const { data, error } = await supabaseAdmin
    .schema("warehouse")
    .from("vehicle_model_codes")
    .insert({ model_name: name, model_code: code, price, arrived_quantity: 0, warehouse_quantity: 0 })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
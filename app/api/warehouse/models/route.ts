// app/api/warehouse/models/route.ts
import { NextResponse } from "next/server";
import { requireAdminRoute } from "@/lib/auth/require-admin-route";
import { verifyAdminCredentials } from "@/lib/auth/verify-admin-credentials";
import { getVehicleModels } from "@/lib/warehouse/admin-data";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { syncVehicleModelQuantities } from "@/lib/warehouse/quantity-sync";

const supabaseAdmin = getSupabaseAdmin();

function makeModelCode(name: string, attempt: number) {
  const prefix = name
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 3)
    .toUpperCase()
    .padEnd(3, "X");

  return `${prefix}-${String(Date.now() + attempt).slice(-5)}`;
}

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

  let lastError: string | null = null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const code = makeModelCode(name, attempt);
    const { data, error } = await supabaseAdmin
      .schema("warehouse")
      .from("vehicle_model_codes")
      .insert({ model_name: name, model_code: code, price, arrived_quantity: 0, warehouse_quantity: 0 })
      .select()
      .single();

    if (!error) return NextResponse.json(data);

    lastError = error.message;
    if (error.code !== "23505") break;
  }

  return NextResponse.json(
    { error: lastError ?? "Failed to create model" },
    { status: 500 }
  );
}

export async function PATCH(req: Request) {
  const authError = await requireAdminRoute();
  if (authError) return authError;

  const body = await req.json();
  const modelCode = String(body.model_code ?? "").trim();
  const price = Number(body.price);

  if (!modelCode || !Number.isFinite(price) || price < 0) {
    return NextResponse.json(
      { error: "Valid model_code and price are required" },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin
    .schema("warehouse")
    .from("vehicle_model_codes")
    .update({ price })
    .eq("model_code", modelCode)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await Promise.all([
    supabaseAdmin
      .schema("warehouse")
      .from("vehicle_inventory")
      .update({ price })
      .eq("model_code", modelCode)
      .neq("status", "ISSUED"),
    supabaseAdmin
      .schema("asb_showrooms")
      .from("dealer_vehicle_inventory")
      .update({ price })
      .eq("model_code", modelCode)
      .is("sold_at", null),
    supabaseAdmin
      .schema("asb_showrooms")
      .from("showroom_vehicle_inventory")
      .update({ price })
      .eq("model_code", modelCode)
      .is("sold_at", null),
  ]);

  return NextResponse.json({ success: true, model: data });
}

export async function DELETE(req: Request) {
  const authError = await requireAdminRoute();
  if (authError) return authError;

  const body = await req.json().catch(() => ({}));
  const { searchParams } = new URL(req.url);
  const modelCode = String(body.model_code ?? searchParams.get("model_code") ?? "").trim();

  const adminVerified = await verifyAdminCredentials(
    body.adminEmail,
    body.adminPassword
  );

  if (!adminVerified) {
    return NextResponse.json(
      { error: "Valid admin credentials are required" },
      { status: 403 }
    );
  }

  if (!modelCode) {
    return NextResponse.json(
      { error: "model_code is required" },
      { status: 400 }
    );
  }

  const { error } = await supabaseAdmin
    .schema("warehouse")
    .from("vehicle_model_codes")
    .delete()
    .eq("model_code", modelCode);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await syncVehicleModelQuantities([modelCode]).catch(() => undefined);

  return NextResponse.json({ success: true });
}

import { NextResponse } from "next/server";
import { requireAdminRoute } from "@/lib/auth/require-admin-route";
import { verifyAdminCredentials } from "@/lib/auth/verify-admin-credentials";
import { getSpareCodes } from "@/lib/warehouse/admin-data";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { syncSpareCodeQuantities } from "@/lib/warehouse/quantity-sync";

const supabaseAdmin = getSupabaseAdmin();

function makeSpareCode(name: string, attempt: number) {
  const prefix = name
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 3)
    .toUpperCase()
    .padEnd(3, "X");

  return `${prefix}-${String(Date.now() + attempt).slice(-5)}`;
}

export async function GET(req: Request) {
  const authError = await requireAdminRoute();
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const model = searchParams.get("model");

  try {
    const data = await getSpareCodes(model ?? undefined);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Failed to load spares" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const authError = await requireAdminRoute();
  if (authError) return authError;

  const body = await req.json();

  if (!body.model_code || !body.spare_name) {
    return NextResponse.json(
      { error: "Missing fields" },
      { status: 400 }
    );
  }

  let lastError: string | null = null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const code = makeSpareCode(body.spare_name, attempt);
    const { data, error } = await supabaseAdmin
      .schema("warehouse")
      .from("vehicle_spare_codes")
      .insert({
        model_code: body.model_code,
        spare_name: body.spare_name,
        spare_code: code,
        price: body.price || 0,
        warehouse_quantity: 0,
        arrived_quantity: 0,
      })
      .select()
      .single();

    if (!error) return NextResponse.json(data);

    lastError = error.message;
    if (error.code !== "23505") break;
  }

  return NextResponse.json(
    { error: lastError ?? "Failed to create spare" },
    { status: 500 }
  );
}

export async function PATCH(req: Request) {
  const authError = await requireAdminRoute();
  if (authError) return authError;

  const body = await req.json();
  const modelCode = String(body.model_code ?? "").trim();
  const spareCode = String(body.spare_code ?? "").trim();
  const price = Number(body.price);

  if (!modelCode || !spareCode || !Number.isFinite(price) || price < 0) {
    return NextResponse.json(
      { error: "Valid model_code, spare_code, and price are required" },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin
    .schema("warehouse")
    .from("vehicle_spare_codes")
    .update({ price })
    .eq("model_code", modelCode)
    .eq("spare_code", spareCode)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await Promise.all([
    supabaseAdmin
      .schema("warehouse")
      .from("vehicle_spare_inventory")
      .update({ price })
      .eq("model_code", modelCode)
      .eq("spare_code", spareCode)
      .neq("status", "ISSUED"),
    supabaseAdmin
      .schema("asb_showrooms")
      .from("dealer_spare_inventory")
      .update({ price: String(price) })
      .eq("model_code", modelCode)
      .eq("spare_code", spareCode)
      .is("sold_at", null),
    supabaseAdmin
      .schema("asb_showrooms")
      .from("showroom_spare_inventory")
      .update({ price: String(price) })
      .eq("model_code", modelCode)
      .eq("spare_code", spareCode)
      .is("sold_at", null),
  ]);

  return NextResponse.json({ success: true, spare: data });
}

export async function DELETE(req: Request) {
  const authError = await requireAdminRoute();
  if (authError) return authError;

  const body = await req.json().catch(() => ({}));
  const { searchParams } = new URL(req.url);
  const modelCode = String(body.model_code ?? searchParams.get("model_code") ?? "").trim();
  const spareCode = String(body.spare_code ?? searchParams.get("spare_code") ?? "").trim();

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

  if (!modelCode || !spareCode) {
    return NextResponse.json(
      { error: "model_code and spare_code are required" },
      { status: 400 }
    );
  }

  const { error } = await supabaseAdmin
    .schema("warehouse")
    .from("vehicle_spare_inventory")
    .delete()
    .eq("model_code", modelCode)
    .eq("spare_code", spareCode);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { error: codeError } = await supabaseAdmin
    .schema("warehouse")
    .from("vehicle_spare_codes")
    .delete()
    .eq("model_code", modelCode)
    .eq("spare_code", spareCode);

  if (codeError) {
    return NextResponse.json({ error: codeError.message }, { status: 500 });
  }

  await syncSpareCodeQuantities([{ modelCode, spareCode }]).catch(() => undefined);

  return NextResponse.json({ success: true });
}

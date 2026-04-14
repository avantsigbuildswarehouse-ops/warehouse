import { NextResponse } from "next/server";
import { requireAdminRoute } from "@/lib/auth/require-admin-route";
import { getSpareCodes } from "@/lib/warehouse/admin-data";
import { supabaseAdmin } from "@/lib/supabase/admin";

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

  const code =
    body.spare_name.substring(0, 3).toUpperCase() +
    "-" +
    Math.floor(Math.random() * 9999);

  const { data, error } = await supabaseAdmin
    .schema("warehouse")
    .from("vehicle_spare_codes")
    .insert({
      model_code: body.model_code,
      spare_name: body.spare_name,
      spare_code: code,
      price: body.price || 0,
      quantity: 0,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ dealerCode: string }> }
) {
  const { dealerCode } = await params;

  const { data: vehicleStock, error: vehicleError } = await supabaseAdmin
    .schema("ASB showrooms")
    .from("dealer_vehicle_inventory")
    .select("*")
    .eq("dealer_code", dealerCode)
    .order("issued_at", { ascending: false });

  if (vehicleError) {
    return NextResponse.json(
      { error: vehicleError.message },
      { status: 500 }
    );
  }

  const { data: spareStock, error: spareError } = await supabaseAdmin
    .schema("ASB showrooms")
    .from("dealer_spare_inventory")
    .select("*")
    .eq("dealer_code", dealerCode)
    .order("issued_at", { ascending: false });

  if (spareError) {
    return NextResponse.json(
      { error: spareError.message },
      { status: 500 }
    );
  }

  const totalBikes = vehicleStock?.length ?? 0;
  const totalSpares = spareStock?.length ?? 0;

  const allDates = [
    ...(vehicleStock?.map((r) => r.issued_at) ?? []),
    ...(spareStock?.map((r) => r.issued_at) ?? []),
  ].filter(Boolean);

  const lastIssue = allDates.length
    ? allDates.sort((a, b) => (a > b ? -1 : 1))[0]
    : null;

  return NextResponse.json({
    stats: { totalBikes, totalSpares, lastIssue },
    vehicleStock: vehicleStock ?? [],
    spareStock: spareStock ?? [],
  });
}
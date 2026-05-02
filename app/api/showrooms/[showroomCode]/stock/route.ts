import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const supabaseAdmin = getSupabaseAdmin();

export async function GET(
  req: Request,
  { params }: { params: Promise<{ showroomCode: string }> }
) {
  const { showroomCode } = await params;
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get('limit') || '1000', 10);

  const { data: vehicleStock, error: vehicleError } = await supabaseAdmin
    .schema("ASB showrooms")
    .from("showroom_vehicle_inventory")
    .select("*")
    .eq("showroom_code", showroomCode)
    .order("issued_at", { ascending: false })
    .limit(limit);

  if (vehicleError) {
    return NextResponse.json(
      { error: vehicleError.message },
      { status: 500 }
    );
  }

  const { data: spareStock, error: spareError } = await supabaseAdmin
    .schema("ASB showrooms")
    .from("showroom_spare_inventory")
    .select("*")
    .eq("showroom_code", showroomCode)
    .order("issued_at", { ascending: false })
    .limit(limit);

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
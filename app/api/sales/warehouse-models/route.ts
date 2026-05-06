import { NextResponse } from "next/server";

import { requireSalesRoute } from "@/lib/auth/require-sales-route";
import { getWarehouseVehicleModels } from "@/lib/sales/advance-bookings";

export async function GET() {
  const auth = await requireSalesRoute();
  if (auth.error) return auth.error;

  try {
    const models = await getWarehouseVehicleModels();
    return NextResponse.json({ success: true, models });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load warehouse models";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

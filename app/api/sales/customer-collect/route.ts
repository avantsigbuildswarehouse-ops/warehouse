import { NextResponse } from "next/server";

import { requireSalesRoute } from "@/lib/auth/require-sales-route";
import { finalizeAdvanceBooking } from "@/lib/sales/advance-bookings";

export async function POST(req: Request) {
  const auth = await requireSalesRoute();
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const targetType = (body?.targetType || "").toLowerCase() as "dealer" | "showroom";
    const targetCode = body?.targetCode as string;

    if (!["dealer", "showroom"].includes(targetType) || !targetCode) {
      return NextResponse.json({ error: "Invalid targetType/targetCode" }, { status: 400 });
    }
    if (auth.identity.role !== "admin" && auth.identity.code !== targetCode) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const result = await finalizeAdvanceBooking({
      buyerType: "customer",
      targetType,
      targetCode,
      saleId: body.saleId,
      vehicleIds: body.vehicleIds,
      payment: body.payment,
    });

    return NextResponse.json({ success: true, result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

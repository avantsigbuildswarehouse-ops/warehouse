import { NextResponse } from "next/server";

import { requireSalesRoute } from "@/lib/auth/require-sales-route";
import { createAdvanceBooking, findAdvanceBooking } from "@/lib/sales/advance-bookings";

export async function GET(req: Request) {
  const auth = await requireSalesRoute();
  if (auth.error) return auth.error;

  try {
    const { searchParams } = new URL(req.url);
    const documentSuffix = (searchParams.get("documentSuffix") || "").trim();
    const targetType = (searchParams.get("targetType") || "").toLowerCase() as "dealer" | "showroom";
    const targetCode = searchParams.get("targetCode") || "";

    if (!documentSuffix || documentSuffix.length < 3) {
      return NextResponse.json({ error: "Document suffix is required" }, { status: 400 });
    }
    if (!["dealer", "showroom"].includes(targetType) || !targetCode) {
      return NextResponse.json({ error: "Invalid targetType/targetCode" }, { status: 400 });
    }
    if (auth.identity.role !== "admin" && auth.identity.code !== targetCode) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const booking = await findAdvanceBooking({
      buyerType: "company",
      targetType,
      targetCode,
      documentSuffix,
    });

    if (!booking) {
      return NextResponse.json({ error: "No matching advance booking found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, booking });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

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

    const booking = await createAdvanceBooking({
      buyerType: "company",
      targetType,
      targetCode,
      requestedItems: body.requestedItems,
      payment: body.payment,
      company: body.company,
    });

    return NextResponse.json({ success: true, booking });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

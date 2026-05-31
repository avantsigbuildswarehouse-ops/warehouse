import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireAdminRoute } from "@/lib/auth/require-admin-route";
import { getPartnerAnalytics } from "@/lib/analytics";
import { ASB_SHOWROOMS_SCHEMA } from "@/lib/db/schema";

const supabase = getSupabaseAdmin();

function getPrice(item: { price: number | string | null }): number {
  const price = item.price;
  if (price === null || price === undefined) return 0;
  if (typeof price === "number") return price;
  const cleaned = String(price).replace(/[^0-9.-]/g, "");
  const parsed = parseFloat(cleaned);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function normalizeEndDate(endDate: string) {
  return endDate.includes("T") ? endDate : `${endDate}T23:59:59.999Z`;
}

export async function GET(req: Request) {
  const authError = await requireAdminRoute();
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const query = (searchParams.get("query") || searchParams.get("q") || "").trim();
  const explicitType = searchParams.get("type") as "dealer" | "showroom" | null;
  const explicitCode = (searchParams.get("code") || "").trim();
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  if (!query && !(explicitType && explicitCode)) {
    return NextResponse.json({ error: "Provide query or type+code" }, { status: 400 });
  }

  try {
    const [dealersResult, showroomsResult] = await Promise.all([
      supabase
        .schema(ASB_SHOWROOMS_SCHEMA)
        .from("dealers")
        .select("dealer_code, business_name, city, is_active"),
      supabase
        .schema(ASB_SHOWROOMS_SCHEMA)
        .from("asb_showrooms")
        .select("showroom_code, city, state, is_active"),
    ]);

    if (dealersResult.error) {
      return NextResponse.json({ error: dealersResult.error.message }, { status: 500 });
    }
    if (showroomsResult.error) {
      return NextResponse.json({ error: showroomsResult.error.message }, { status: 500 });
    }

    type PartnerMatch = {
      type: "dealer" | "showroom";
      code: string;
      name: string;
      city: string | null;
      isActive: boolean;
    };

    const dealers = (dealersResult.data || []).map((row) => ({
      type: "dealer" as const,
      code: row.dealer_code as string,
      name: row.business_name as string,
      city: (row.city as string) || null,
      isActive: Boolean(row.is_active),
    }));

    const showrooms = (showroomsResult.data || []).map((row) => {
      const city = (row.city as string) || "";
      const state = (row.state as string) || "";
      return {
        type: "showroom" as const,
        code: row.showroom_code as string,
        name: city,
        city: city || null,
        state: state || null,
        isActive: Boolean(row.is_active),
      };
    });

    let match: PartnerMatch | undefined;

    if (explicitType && explicitCode) {
      const pool = explicitType === "dealer" ? dealers : showrooms;
      match = pool.find((p) => p.code.toLowerCase() === explicitCode.toLowerCase());
    } else {
      const q = query.toLowerCase();
      match =
        dealers.find((p) => p.code.toLowerCase() === q) ||
        showrooms.find((p) => p.code.toLowerCase() === q) ||
        dealers.find((p) => p.name.toLowerCase().includes(q)) ||
        showrooms.find((p) => (p.city || "").toLowerCase().includes(q)) ||
        dealers.find((p) => p.code.toLowerCase().includes(q)) ||
        showrooms.find((p) => p.code.toLowerCase().includes(q));
    }

    if (!match) {
      return NextResponse.json({ error: "No dealer or showroom matched your search" }, { status: 404 });
    }

    const codePattern = match.code;
    const partnerAnalytics = await getPartnerAnalytics(match.type, match.code);

    let vehicleQuery = supabase
      .schema("warehouse")
      .from("vehicle_inventory")
      .select("price, issued_at")
      .eq("issued_to", codePattern)
      .neq("issued_to", "none");

    let spareQuery = supabase
      .schema("warehouse")
      .from("vehicle_spare_inventory")
      .select("price, issued_at")
      .eq("issued_to", codePattern)
      .neq("issued_to", "none");

    if (startDate) {
      vehicleQuery = vehicleQuery.gte("issued_at", startDate);
      spareQuery = spareQuery.gte("issued_at", startDate);
    }
    if (endDate) {
      const end = normalizeEndDate(endDate);
      vehicleQuery = vehicleQuery.lte("issued_at", end);
      spareQuery = spareQuery.lte("issued_at", end);
    }

    const [vehicleResult, spareResult] = await Promise.all([
      vehicleQuery,
      spareQuery,
    ]);

    if (vehicleResult.error) {
      return NextResponse.json({ error: vehicleResult.error.message }, { status: 500 });
    }
    if (spareResult.error) {
      return NextResponse.json({ error: spareResult.error.message }, { status: 500 });
    }

    const warehouseVehicles = vehicleResult.data || [];
    const warehouseSpares = spareResult.data || [];
    const warehouseIssuanceValue =
      warehouseVehicles.reduce((sum, row) => sum + getPrice(row), 0) +
      warehouseSpares.reduce((sum, row) => sum + getPrice(row), 0);

    return NextResponse.json({
      success: true,
      partner: {
        type: match.type,
        code: match.code,
        name: match.name,
        city: match.city,
        isActive: match.isActive,
      },
      inventory: {
        bikeUnits: partnerAnalytics.totals.bikeInventoryUnits,
        spareUnits: partnerAnalytics.totals.spareInventoryUnits,
        bikeValue: partnerAnalytics.totals.bikeInventoryValue,
        spareValue: partnerAnalytics.totals.spareInventoryValue,
        totalInventoryValue:
          partnerAnalytics.totals.bikeInventoryValue + partnerAnalytics.totals.spareInventoryValue,
      },
      retailSales: {
        bikesSold: partnerAnalytics.totals.bikesSold,
        sparesSold: partnerAnalytics.totals.sparesSold,
        bikeSalesValue: partnerAnalytics.totals.bikeSalesValue,
        spareSalesValue: partnerAnalytics.totals.spareSalesValue,
        totalRetailValue:
          partnerAnalytics.totals.bikeSalesValue + partnerAnalytics.totals.spareSalesValue,
      },
      warehouseIssuance: {
        vehicles: warehouseVehicles.length,
        spares: warehouseSpares.length,
        totalValue: warehouseIssuanceValue,
      },
      soldVehicles: partnerAnalytics.soldVehicles.slice(0, 50),
      soldSpares: partnerAnalytics.soldSpares.slice(0, 50),
    });
  } catch (error) {
    console.error("Partner report error:", error);
    return NextResponse.json({ error: "Failed to load partner report" }, { status: 500 });
  }
}

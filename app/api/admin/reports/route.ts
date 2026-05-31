import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireAdminRoute } from "@/lib/auth/require-admin-route";
import { ASB_SHOWROOMS_SCHEMA } from "@/lib/db/schema";

const supabase = getSupabaseAdmin();

function normalizeEndDate(endDate: string) {
  return endDate.includes("T") ? endDate : `${endDate}T23:59:59.999Z`;
}

type VehicleSale = {
  type: 'vehicle';
  model_code: string;
  engine_number: string;
  chassis_number: string;
  color: string | null;
  yom: string | null;
  version: string | null;
  price: number | string | null;
  issued_at: string;
  issued_to: string;
};

type SpareSale = {
  type: 'spare';
  model_code: string;
  spare_code: string;
  serial_number: string;
  price: number | string | null;
  issued_at: string;
  issued_to: string;
};

type UnifiedSale = VehicleSale | SpareSale;

export async function GET(req: Request) {
  const authError = await requireAdminRoute();
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const category = searchParams.get("category"); // 'showroom', 'dealer', 'all'
  const type = searchParams.get("type"); // 'vehicles', 'spares', 'all'
  const recentLimit = Math.min(Math.max(parseInt(searchParams.get("limit") || "50", 10), 1), 200);

  try {
    // Base queries for sold items (issued_to is not "none")
    let vehicleQuery = supabase
      .schema("warehouse")
      .from("vehicle_inventory")
      .select("model_code, engine_number, chassis_number, color, yom, version, price, issued_at, issued_to")
      .neq("issued_to", "none")
      .neq("issued_to", null);

    let spareQuery = supabase
      .schema("warehouse")
      .from("vehicle_spare_inventory")
      .select("model_code, spare_code, serial_number, price, issued_at, issued_to")
      .neq("issued_to", "none")
      .neq("issued_to", null);

    // Apply date filters
    if (startDate) {
      vehicleQuery = vehicleQuery.gte("issued_at", startDate);
      spareQuery = spareQuery.gte("issued_at", startDate);
    }
    if (endDate) {
      const end = normalizeEndDate(endDate);
      vehicleQuery = vehicleQuery.lte("issued_at", end);
      spareQuery = spareQuery.lte("issued_at", end);
    }

    // Apply category filters (showroom/dealer)
    if (category && category !== 'all') {
      const pattern = category === 'showroom' ? 'ASB-SH-%' : 'ASB-DL-%';
      vehicleQuery = vehicleQuery.like("issued_to", pattern);
      spareQuery = spareQuery.like("issued_to", pattern);
    }

    // Execute queries
    const [vehicleResult, spareResult] = await Promise.all([
      vehicleQuery.order("issued_at", { ascending: false }),
      spareQuery.order("issued_at", { ascending: false }),
    ]);

    if (vehicleResult.error) {
      return NextResponse.json({ error: vehicleResult.error.message }, { status: 500 });
    }
    if (spareResult.error) {
      return NextResponse.json({ error: spareResult.error.message }, { status: 500 });
    }

    let vehicles: VehicleSale[] = (vehicleResult.data || []).map((v) => ({ ...v, type: "vehicle" as const }));
    let spares: SpareSale[] = (spareResult.data || []).map((s) => ({ ...s, type: "spare" as const }));

    if (type === "vehicles") {
      spares = [];
    } else if (type === "spares") {
      vehicles = [];
    }

    // Helper function to get price as number
    const getPrice = (item: VehicleSale | SpareSale): number => {
      const price = item.price;
      if (price === null || price === undefined) return 0;
      if (typeof price === 'number') return price;
      if (typeof price === 'string') {
        const cleaned = price.replace(/[^0-9.-]/g, '');
        const parsed = parseFloat(cleaned);
        return isNaN(parsed) ? 0 : parsed;
      }
      return 0;
    };

    // Calculate totals
    const vehicleTotal = vehicles.reduce((sum, v) => sum + getPrice(v), 0);
    const spareTotal = spares.reduce((sum, s) => sum + getPrice(s), 0);

    // Type guard functions
    const isVehicle = (item: UnifiedSale): item is VehicleSale => item.type === 'vehicle';
    const isSpare = (item: UnifiedSale): item is SpareSale => item.type === 'spare';

    // Categorize by issued_to type
    const categorizeByIssuedTo = (items: UnifiedSale[]) => {
      const showrooms: UnifiedSale[] = [];
      const dealers: UnifiedSale[] = [];
      
      items.forEach(item => {
        const issuedTo = item.issued_to || '';
        if (issuedTo.includes('SH')) {
          showrooms.push(item);
        } else if (issuedTo.includes('DL')) {
          dealers.push(item);
        }
      });
      
      return { showrooms, dealers };
    };

    const allSales = [...vehicles, ...spares];
    const vehicleCategories = categorizeByIssuedTo(vehicles);
    const spareCategories = categorizeByIssuedTo(spares);
    const allCategories = categorizeByIssuedTo(allSales);

    // Calculate category totals
    const showroomVehicleTotal = vehicleCategories.showrooms.reduce((sum, v) => sum + getPrice(v), 0);
    const showroomSpareTotal = spareCategories.showrooms.reduce((sum, s) => sum + getPrice(s), 0);
    const dealerVehicleTotal = vehicleCategories.dealers.reduce((sum, v) => sum + getPrice(v), 0);
    const dealerSpareTotal = spareCategories.dealers.reduce((sum, s) => sum + getPrice(s), 0);

    // Group by month for chart data
    const monthlyData = new Map<
      string,
      {
        monthKey: string;
        month: string;
        vehicles: number;
        spares: number;
        total: number;
      }
    >();

    allSales.forEach((item) => {
      const date = new Date(item.issued_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const monthName = date.toLocaleString("default", { month: "long", year: "numeric" });

      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, {
          monthKey,
          month: monthName,
          vehicles: 0,
          spares: 0,
          total: 0,
        });
      }
      
      const data = monthlyData.get(monthKey)!;
      const price = getPrice(item);
      
      if (isVehicle(item)) {
        data.vehicles += price;
      } else if (isSpare(item)) {
        data.spares += price;
      }
      data.total += price;
    });

    const monthlyBreakdown = Array.from(monthlyData.values())
      .sort((a, b) => a.monthKey.localeCompare(b.monthKey))
      .map(({ monthKey: _monthKey, ...rest }) => rest);

    const [dealersResult, showroomsResult] = await Promise.all([
      supabase.schema(ASB_SHOWROOMS_SCHEMA).from("dealers").select("dealer_code, business_name"),
      supabase.schema(ASB_SHOWROOMS_SCHEMA).from("asb_showrooms").select("showroom_code, city"),
    ]);

    const partnerNames = new Map<string, string>();
    for (const row of dealersResult.data || []) {
      partnerNames.set(row.dealer_code as string, row.business_name as string);
    }
    for (const row of showroomsResult.data || []) {
      partnerNames.set(row.showroom_code as string, (row.city as string) || row.showroom_code);
    }

    // Group sales by partner (showroom/dealer)
    const partnerSales = new Map<string, {
      partnerId: string;
      partnerType: string;
      vehicleCount: number;
      spareCount: number;
      totalValue: number;
      items: UnifiedSale[];
    }>();
    
    allSales.forEach(item => {
      const partnerId = item.issued_to;
      if (!partnerId) return;
      
      const partnerType = partnerId.includes('SH') ? 'showroom' : 'dealer';
      const price = getPrice(item);
      
      if (!partnerSales.has(partnerId)) {
        partnerSales.set(partnerId, {
          partnerId,
          partnerType,
          vehicleCount: 0,
          spareCount: 0,
          totalValue: 0,
          items: []
        });
      }
      
      const partner = partnerSales.get(partnerId)!;
      if (isVehicle(item)) {
        partner.vehicleCount++;
      } else if (isSpare(item)) {
        partner.spareCount++;
      }
      partner.totalValue += price;
      partner.items.push(item);
    });

    const topPartners = Array.from(partnerSales.values())
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 10);

    // Recent sales (last 50)
    const recentSales = allSales
      .sort((a, b) => new Date(b.issued_at).getTime() - new Date(a.issued_at).getTime())
      .slice(0, recentLimit)
      .map(item => ({
        type: item.type,
        model_code: item.model_code,
        price: getPrice(item),
        issued_at: item.issued_at,
        issued_to: item.issued_to,
        ...(isVehicle(item) && {
          engine_number: item.engine_number,
          chassis_number: item.chassis_number,
        }),
        ...(isSpare(item) && {
          spare_code: item.spare_code,
          serial_number: item.serial_number,
        }),
      }));

    return NextResponse.json({
      success: true,
      summary: {
        totalVehiclesSold: vehicles.length,
        totalSparesSold: spares.length,
        totalVehicleValue: vehicleTotal,
        totalSpareValue: spareTotal,
        totalValue: vehicleTotal + spareTotal,
        showroomValue: showroomVehicleTotal + showroomSpareTotal,
        dealerValue: dealerVehicleTotal + dealerSpareTotal,
        showroomVehicles: vehicleCategories.showrooms.length,
        showroomSpares: spareCategories.showrooms.length,
        dealerVehicles: vehicleCategories.dealers.length,
        dealerSpares: spareCategories.dealers.length,
      },
      monthlyBreakdown,
      topPartners: topPartners.map((p) => ({
        partnerId: p.partnerId,
        partnerName: partnerNames.get(p.partnerId) || null,
        partnerType: p.partnerType,
        vehicleCount: p.vehicleCount,
        spareCount: p.spareCount,
        totalValue: p.totalValue,
      })),
      recentSales,
    });
  } catch (error) {
    console.error('Error fetching sales analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sales analytics' },
      { status: 500 }
    );
  }
}
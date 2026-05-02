//;
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const supabaseAdmin = getSupabaseAdmin();

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const rows: any[] = [];

    if (!type || type === "all" || type === "showroom") {
      const { data: showroomBikes } = await supabaseAdmin
        .schema("ASB showrooms")
        .from("showroom_vehicle_inventory")
        .select("*")
        .order("issued_at", { ascending: false });

      const { data: showroomSpares } = await supabaseAdmin
        .schema("ASB showrooms")
        .from("showroom_spare_inventory")
        .select("*")
        .order("issued_at", { ascending: false });

      showroomBikes?.forEach((row) =>
        rows.push({
          type: "Bike",
          target: "Showroom",
          target_code: row.showroom_code,
          model_code: row.model_code,
          identifier: row.engine_number,
          price: row.price ?? 0,
          issued_at: row.issued_at,
        })
      );

      showroomSpares?.forEach((row) =>
        rows.push({
          type: "Spare",
          target: "Showroom",
          target_code: row.showroom_code,
          model_code: row.spare_code,
          identifier: row.serial_number,
          price: row.price ?? 0,
          issued_at: row.issued_at,
        })
      );
    }

    if (!type || type === "all" || type === "dealer") {
      const { data: dealerBikes } = await supabaseAdmin
        .schema("ASB showrooms")
        .from("dealer_vehicle_inventory")
        .select("*")
        .order("issued_at", { ascending: false });

      const { data: dealerSpares } = await supabaseAdmin
        .schema("ASB showrooms")
        .from("dealer_spare_inventory")
        .select("*")
        .order("issued_at", { ascending: false });

      dealerBikes?.forEach((row) =>
        rows.push({
          type: "Bike",
          target: "Dealer",
          target_code: row.dealer_code,
          model_code: row.model_code,
          identifier: row.engine_number,
          price: row.price ?? 0,
          issued_at: row.issued_at,
        })
      );

      dealerSpares?.forEach((row) =>
        rows.push({
          type: "Spare",
          target: "Dealer",
          target_code: row.dealer_code,
          model_code: row.spare_code,
          identifier: row.serial_number,
          price: row.price ?? 0,
          issued_at: row.issued_at,
        })
      );
    }

    // Group by target_code + date (YYYY-MM-DD)
    const groupMap = new Map<string, any>();

    rows.forEach((row) => {
      const date = new Date(row.issued_at).toISOString().split("T")[0];
      const key = `${row.target}__${row.target_code}__${date}`;

      if (!groupMap.has(key)) {
        groupMap.set(key, {
          key,
          target: row.target,
          target_code: row.target_code,
          date,
          items: [],
          totalValue: 0,
          bikeCount: 0,
          spareCount: 0,
          latestIssuedAt: row.issued_at,
        });
      }

      const group = groupMap.get(key);
      group.items.push(row);
      group.totalValue += Number(row.price || 0);
      if (row.type === "Bike") group.bikeCount += 1;
      else group.spareCount += 1;
      if (row.issued_at > group.latestIssuedAt) {
        group.latestIssuedAt = row.issued_at;
      }
    });

    let groups = Array.from(groupMap.values()).sort(
      (a, b) => new Date(b.latestIssuedAt).getTime() - new Date(a.latestIssuedAt).getTime()
    );

    const totalGroups = groups.length;
    const totalPages = Math.ceil(totalGroups / limit);
    const offset = (page - 1) * limit;
    const paginatedGroups = groups.slice(offset, offset + limit);

    return NextResponse.json({ 
      groups: paginatedGroups,
      pagination: {
        total: totalGroups,
        page,
        limit,
        totalPages
      }
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch issued history" },
      { status: 500 }
    );
  }
}
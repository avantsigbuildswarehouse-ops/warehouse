// app/api/dealers/requests/route.ts
import "server-only";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin"; // Use the same admin client
import { cleanupExpiredRequests } from "@/lib/request-lifecycle";

type RequestRow = {
  reference_no: string;
  dealer_code: string;
  price: number | string | null;
  status: string | null;
  remarks: string | null;
  requested_at: string;
};

type GroupedRequest = {
  id: string;
  reference_no: string;
  dealer_code: string;
  item_type: string;
  items_count: number;
  total_value: number;
  status: string;
  remarks: string | null;
  requested_at: string;
  items: RequestRow[];
};

export async function GET(req: Request) {
  try {
    await cleanupExpiredRequests();

    const url = new URL(req.url);
    const dealerCode = url.searchParams.get("dealerCode");

    if (!dealerCode || dealerCode === "undefined") {
      return NextResponse.json({ error: "Missing dealerCode" }, { status: 400 });
    }

    console.log("Fetching requests for dealer:", dealerCode);

    // Fetch both tables in parallel using supabaseAdmin
    const [vehicleResult, spareResult] = await Promise.all([
      supabaseAdmin
        .from("dealer_vehicle_requests")
        .select("*")
        .eq("dealer_code", dealerCode)
        .order("requested_at", { ascending: false }),
      supabaseAdmin
        .from("dealer_spare_requests")
        .select("*")
        .eq("dealer_code", dealerCode)
        .order("requested_at", { ascending: false }),
    ]);

    console.log("Vehicle result:", {
      error: vehicleResult.error,
      count: vehicleResult.data?.length || 0
    });
    console.log("Spare result:", {
      error: spareResult.error,
      count: spareResult.data?.length || 0
    });

    if (vehicleResult.error) {
      console.error("Vehicle requests error:", vehicleResult.error);
    }
    if (spareResult.error) {
      console.error("Spare requests error:", spareResult.error);
    }

    const vehicleRequests = vehicleResult.data || [];
    const spareRequests = spareResult.data || [];

    console.log(`Found ${vehicleRequests.length} vehicle requests and ${spareRequests.length} spare requests`);

    // If we have data, log a sample
    if (vehicleRequests.length > 0) {
      console.log("Sample vehicle request:", JSON.stringify(vehicleRequests[0], null, 2));
    }

    // Group by reference_no
    const groupedVehicles = groupByReference(vehicleRequests, "Bike");
    const groupedSpares = groupByReference(spareRequests, "Spare");

    const allRequests = [...groupedVehicles, ...groupedSpares]
      .sort((a, b) => new Date(b.requested_at).getTime() - new Date(a.requested_at).getTime());

    return NextResponse.json({
      success: true,
      requests: allRequests,
      total: allRequests.length,
    });

  } catch (err: unknown) {
    console.error("Error fetching requests:", err);
    const message = err instanceof Error ? err.message : "Unexpected server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function groupByReference(items: RequestRow[], itemType: string) {
  const groups = new Map<string, GroupedRequest>();

  items.forEach((item) => {
    const groupRef = getBatchReference(item.reference_no);
    if (!groups.has(groupRef)) {
      groups.set(groupRef, {
        id: groupRef,
        reference_no: groupRef,
        dealer_code: item.dealer_code,
        item_type: itemType,
        items_count: 0,
        total_value: 0,
        status: "PENDING",
        remarks: item.remarks || null,
        requested_at: item.requested_at,
        items: [],
      });
    }

    const group = groups.get(groupRef)!;
    group.items.push(item);
    group.items_count = group.items.length;
    group.total_value += Number(item.price || 0);

    if (item.status && item.status !== "PENDING") {
      group.status = item.status;
    }
    
    if (new Date(item.requested_at) < new Date(group.requested_at)) {
      group.requested_at = item.requested_at;
    }
    
    if (item.remarks && !group.remarks) {
      group.remarks = item.remarks;
    }
  });

  return Array.from(groups.values());
}

function getBatchReference(referenceNo: string) {
  return referenceNo.replace(/-\d{2}$/, "");
}
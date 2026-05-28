import { NextResponse } from "next/server";

import { requireAdminRequest } from "@/lib/auth/require-admin-request";
import { ASB_SHOWROOMS_SCHEMA } from "@/lib/db/schema";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { PartnerCodeOption } from "@/types/admin";

const supabaseAdmin = getSupabaseAdmin();

export async function GET(req: Request) {
  const authResult = await requireAdminRequest(req);
  if (!authResult.ok) return authResult.response;

  const [dealersResult, showroomsResult] = await Promise.all([
    supabaseAdmin
      .schema(ASB_SHOWROOMS_SCHEMA)
      .from("dealers")
      .select("dealer_code, business_name")
      .eq("is_active", true)
      .order("business_name", { ascending: true }),
    supabaseAdmin
      .schema(ASB_SHOWROOMS_SCHEMA)
      .from("asb_showrooms")
      .select("showroom_code, city, state")
      .eq("is_active", true)
      .order("city", { ascending: true }),
  ]);

  if (dealersResult.error || showroomsResult.error) {
    return NextResponse.json(
      {
        error:
          dealersResult.error?.message ??
          showroomsResult.error?.message ??
          "Failed to load code options",
      },
      { status: 500 }
    );
  }

  const dealers: PartnerCodeOption[] = (dealersResult.data ?? []).map(
    (dealer) => ({
      type: "dealer",
      code: dealer.dealer_code,
      label: `${dealer.business_name} (${dealer.dealer_code})`,
    })
  );

  const showrooms: PartnerCodeOption[] = (showroomsResult.data ?? []).map(
    (showroom) => ({
      type: "showroom",
      code: showroom.showroom_code,
      label: `${showroom.city}, ${showroom.state} (${showroom.showroom_code})`,
    })
  );

  return NextResponse.json({ dealers, showrooms });
}

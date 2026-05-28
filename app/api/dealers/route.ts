import { NextResponse } from "next/server";
import { requireAdminRequest } from "@/lib/auth/require-admin-request";
import { ASB_SHOWROOMS_SCHEMA } from "@/lib/db/schema";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type Dealer = {
  dealer_code: string;
  business_name: string;
  owner_name?: string;
  city: string;
  state: string;
  address: string;
  is_active: boolean;
  created_at?: string;
};

const supabaseAdmin = getSupabaseAdmin();

function getNextDealerCode(codes: string[]) {
  const max = codes.reduce((highest, code) => {
    const match = code.match(/^ASB-DL-(\d+)$/);
    return match ? Math.max(highest, parseInt(match[1], 10)) : highest;
  }, 0);

  return `ASB-DL-${String(max + 1).padStart(3, "0")}`;
}

async function generateDealerCode() {
  const { data, error } = await supabaseAdmin
    .schema(ASB_SHOWROOMS_SCHEMA)
    .from("dealers")
    .select("dealer_code")
    .order("dealer_code", { ascending: false });

  if (error) throw new Error(error.message);

  return getNextDealerCode((data ?? []).map((row) => row.dealer_code));
}

/* ---------------- GET ALL DEALERS ---------------- */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const offset = (page - 1) * limit;

  const { data, error } = await supabaseAdmin
    .schema(ASB_SHOWROOMS_SCHEMA)
    .from("dealers")
    .select("*")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json(data ?? []);
}

/* ---------------- CREATE DEALER ---------------- */
export async function POST(req: Request) {
  try {
    const authResult = await requireAdminRequest(req);
    if (!authResult.ok) return authResult.response;

    const body: Omit<Dealer, "dealer_code"> & { dealer_code?: string } =
      await req.json();
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const dealer_code = await generateDealerCode();
      const { error } = await supabaseAdmin
        .schema(ASB_SHOWROOMS_SCHEMA)
        .from("dealers")
        .insert({ ...body, dealer_code });

      if (!error) {
        return NextResponse.json({ success: true, dealer: { dealer_code } });
      }

      lastError = new Error(error.message);
      if (error.code !== "23505") break;
    }

    return NextResponse.json(
      { error: lastError?.message ?? "Failed to create dealer" },
      { status: 500 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid request" },
      { status: 400 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const authResult = await requireAdminRequest(req);
    if (!authResult.ok) return authResult.response;

    const { dealer_code } = await req.json();

    if (!dealer_code) {
      return NextResponse.json(
        { error: "dealer_code is required" },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .schema(ASB_SHOWROOMS_SCHEMA)
      .from("dealers")
      .delete()
      .eq("dealer_code", dealer_code);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

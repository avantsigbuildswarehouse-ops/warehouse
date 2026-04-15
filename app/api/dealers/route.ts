import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

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

/* ---------------- GET ALL DEALERS ---------------- */
export async function GET() {
  const { data, error } = await supabaseAdmin
    .schema("ASB showrooms")
    .from("dealers")
    .select("*")
    .order("created_at", { ascending: false });

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
    const body: Dealer = await req.json();

    const { error } = await supabaseAdmin
      .schema("ASB showrooms")
      .from("dealers")
      .insert(body);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 }
    );
  }
}

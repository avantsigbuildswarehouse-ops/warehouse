import { NextResponse } from "next/server";
import { requireAdminRoute } from "@/lib/auth/require-admin-route";
import { supabaseAdmin } from "@/lib/supabase/admin";

type Profile = {
    id: string;
    email: string;
    role: string;
    code: string;
    created_at: string; 
}

export async function GET() {
  const { data, error } = await supabaseAdmin
    .schema("public")
    .from("profiles")
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


export async function POST(req: Request) {
  try {
    const body: Profile = await req.json();

    const { error } = await supabaseAdmin
      .schema("public")
      .from("profiles")
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
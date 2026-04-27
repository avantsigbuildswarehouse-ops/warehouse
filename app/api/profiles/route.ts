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

export async function GET(req: Request) {
  try {
    // Check for authentication header
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !userData.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = (page - 1) * limit;

    const { data, error, count } = await supabaseAdmin
      .schema("public")
      .from("profiles")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      items: data ?? [],
      pagination: {
        page,
        limit,
        total: count ?? 0,
        totalPages: Math.max(1, Math.ceil((count ?? 0) / limit)),
      },
    });
  } catch {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
}


export async function POST(req: Request) {
  try {
    const authError = await requireAdminRoute();
    if (authError) return authError;

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
  } catch {
    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 }
    );
  }
}
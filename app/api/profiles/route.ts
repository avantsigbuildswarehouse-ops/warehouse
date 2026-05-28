import { NextResponse } from "next/server";
import { requireAdminRequest } from "@/lib/auth/require-admin-request";
import { verifyAdminCredentials } from "@/lib/auth/verify-admin-credentials";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { ProfileRecord, ProfileRole } from "@/types/admin";

type CreateProfileBody = {
  email: string;
  password: string;
  role: ProfileRole;
  code?: string | null;
  adminEmail: string;
  adminPassword: string;
};

const supabaseAdmin = getSupabaseAdmin();

export async function GET(req: Request) {
  try {
    const authResult = await requireAdminRequest(req);
    if (!authResult.ok) return authResult.response;

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
    const authResult = await requireAdminRequest(req);
    if (!authResult.ok) return authResult.response;

    const body: CreateProfileBody = await req.json();
    const email = body.email?.trim().toLowerCase();
    const password = body.password;
    const role = body.role;
    const code = body.code?.trim() || null;

    if (!email || !password || !role) {
      return NextResponse.json(
        { error: "Email, password, and role are required" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    const verified = await verifyAdminCredentials(
      body.adminEmail,
      body.adminPassword
    );

    if (!verified) {
      return NextResponse.json(
        { error: "Invalid admin credentials" },
        { status: 401 }
      );
    }

    const { data: createdUser, error: createUserError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { role, code },
      });

    if (createUserError || !createdUser.user) {
      return NextResponse.json(
        { error: createUserError?.message ?? "Failed to create auth user" },
        { status: 500 }
      );
    }

    const profile: Omit<ProfileRecord, "created_at"> = {
      id: createdUser.user.id,
      email,
      role,
      code,
    };

    const { error } = await supabaseAdmin
      .from("profiles")
      .upsert(profile, { onConflict: "id" });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, profile });
  } catch {
    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 }
    );
  }
}

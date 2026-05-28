import { NextResponse } from "next/server";
import { requireAdminRequest } from "@/lib/auth/require-admin-request";
import { verifyAdminCredentials } from "@/lib/auth/verify-admin-credentials";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const supabaseAdmin = getSupabaseAdmin();

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAdminRequest(req);
    if (!authResult.ok) return authResult.response;

    const { id } = await params;
    const body = await req.json();

    const { role, code, adminEmail, adminPassword } = body;

    if (!role) {
      return NextResponse.json(
        { error: "Role is required" },
        { status: 400 }
      );
    }

    const verified = await verifyAdminCredentials(adminEmail, adminPassword);

    if (!verified) {
      return NextResponse.json(
        { error: "Invalid admin credentials" },
        { status: 401 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("profiles")
      .update({ role, code: code ?? null })
      .eq("id", id)
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("PATCH error:", err);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAdminRequest(req);
    if (!authResult.ok) return authResult.response;

    const { id } = await params;
    const body = await req.json();
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

    if (authResult.userId === id) {
      return NextResponse.json(
        { error: "Admins cannot delete their own active session account" },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin.auth.admin.deleteUser(id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await supabaseAdmin.from("profiles").delete().eq("id", id);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE profile error:", err);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

import { NextResponse } from "next/server";
import { requireAdminRoute } from "@/lib/auth/require-admin-route";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authError = await requireAdminRoute();
    if (authError) return authError;

    const { id } = await params;
    const body = await req.json();

    const { role, code } = body;

    if (!role) {
      return NextResponse.json(
        { error: "Role is required" },
        { status: 400 }
      );
    }

    console.log("Updating profile:", { id, role, code });

    const { data, error } = await supabaseAdmin
      .schema("public")
      .from("profiles")
      .update({ role, code: code ?? null })
      .eq("id", id)
      .select();

    console.log("Update result:", { data, error });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("PATCH error:", err);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type AdminRequestResult =
  | { ok: true; userId: string | null }
  | { ok: false; response: NextResponse };

export async function requireAdminRequest(req: Request): Promise<AdminRequestResult> {
  try {
    const authHeader = req.headers.get("authorization");

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice("Bearer ".length);
      const supabaseAdmin = getSupabaseAdmin();
      const { data, error } = await supabaseAdmin.auth.getUser(token);

      if (error || !data.user) {
        return {
          ok: false,
          response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
        };
      }

      const { data: profile, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();

      if (profileError || profile?.role !== "admin") {
        return {
          ok: false,
          response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
        };
      }

      return { ok: true, userId: data.user.id };
    }

    const supabase = createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return {
        ok: false,
        response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      };
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || profile?.role !== "admin") {
      return {
        ok: false,
        response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
      };
    }

    return { ok: true, userId: user.id };
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
}

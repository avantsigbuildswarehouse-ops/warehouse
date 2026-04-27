import "server-only";

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export type SalesIdentity = {
  role: string;
  code: string | null;
};

export async function requireSalesRoute() {
  const supabase = createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, code")
    .eq("id", userData.user.id)
    .single();

  if (profileError || !profile?.role) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const role = profile.role as string;
  if (!["admin", "dealer-admin", "showroom-admin"].includes(role)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { identity: { role, code: (profile.code as string | null) ?? null } satisfies SalesIdentity };
}


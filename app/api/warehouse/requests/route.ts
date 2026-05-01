import "server-only";
import { NextResponse } from "next/server";
import { getAdminRequestGroups } from "@/lib/request-lifecycle";
import { requireAdminRoute } from "@/lib/auth/require-admin-route";

export async function GET() {
  try {
    const authError = await requireAdminRoute();
    if (authError) return authError;

    const requests = await getAdminRequestGroups();
    return NextResponse.json({ success: true, requests });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load request queue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

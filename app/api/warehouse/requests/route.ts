import "server-only";
import { NextResponse } from "next/server";
import { getAdminRequestGroups } from "@/lib/request-lifecycle";

export async function GET() {
  try {
    const requests = await getAdminRequestGroups();
    return NextResponse.json({ success: true, requests });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load request queue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

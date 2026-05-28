import { NextResponse } from "next/server";
import { requireAdminRequest } from "@/lib/auth/require-admin-request";
import {
  getShowrooms,
  createShowroom,
} from "@/lib/showrooms/route";

/**
 * GET all showrooms
 */
export async function GET() {
  try {
    const data = await getShowrooms();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}

/**
 * POST create showroom
 */
export async function POST(req: Request) {
  try {
    const authResult = await requireAdminRequest(req);
    if (!authResult.ok) return authResult.response;

    const body = await req.json();

    const showroom = await createShowroom(body);

    return NextResponse.json({ success: true, showroom });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 400 }
    );
  }
}

import { NextResponse } from "next/server";
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
    const body = await req.json();

    await createShowroom(body);

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 400 }
    );
  }
}

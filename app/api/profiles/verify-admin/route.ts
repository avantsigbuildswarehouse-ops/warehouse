import { NextResponse } from "next/server";

import { verifyAdminCredentials } from "@/lib/auth/verify-admin-credentials";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { email, password } = body;

    // Validate inputs
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Email format validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email as string)) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const verified = await verifyAdminCredentials(email, password);

    if (!verified) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

import { NextResponse } from "next/server";

import { getUserRole } from "@/lib/auth/get-user-role";

export async function requireAdminRoute() {
  const role = await getUserRole();

  if (!role) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return null;
}

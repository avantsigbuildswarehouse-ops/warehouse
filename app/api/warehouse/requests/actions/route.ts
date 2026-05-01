import "server-only";
import { NextResponse } from "next/server";
import { cleanupExpiredRequests, issueRequest, releaseRequest, updateRequestStatus } from "@/lib/request-lifecycle";
import { requireAdminRoute } from "@/lib/auth/require-admin-route";

export async function POST(req: Request) {
  try {
    const authError = await requireAdminRoute();
    if (authError) return authError;

    const body = await req.json();
    const action = body?.action as string | undefined;
    const referenceNo = body?.referenceNo as string | undefined;

    if (!action) {
      return NextResponse.json({ error: "Missing action" }, { status: 400 });
    }

    if (action === "cleanupExpired") {
      const result = await cleanupExpiredRequests();
      return NextResponse.json({ success: true, ...result });
    }

    if (!referenceNo) {
      return NextResponse.json({ error: "Missing referenceNo" }, { status: 400 });
    }

    if (action === "approve") {
      await updateRequestStatus(referenceNo, "APPROVED");
      return NextResponse.json({ success: true });
    }

    if (action === "hold") {
      await updateRequestStatus(referenceNo, "HOLD");
      return NextResponse.json({ success: true });
    }

    if (action === "reject") {
      await releaseRequest(referenceNo);
      return NextResponse.json({ success: true });
    }

    if (action === "issue") {
      const result = await issueRequest(referenceNo);
      return NextResponse.json({ success: true, ...result });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to process action";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

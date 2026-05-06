import { NextResponse } from "next/server";

import { requireSalesRoute } from "@/lib/auth/require-sales-route";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const supabaseAdmin = getSupabaseAdmin();

export async function GET(req: Request) {
  const auth = await requireSalesRoute();
  if (auth.error) return auth.error;

  try {
    const { searchParams } = new URL(req.url);
    const saleId = searchParams.get("sale_id");
    const buyerType = searchParams.get("buyer_type");
    const buyerId = searchParams.get("buyer_id");

    if (!saleId || !buyerType || !buyerId) {
      return NextResponse.json(
        { error: "Missing required parameters: sale_id, buyer_type, buyer_id" },
        { status: 400 }
      );
    }

    const tableName = buyerType === "company" ? "company_documents" : "customer_documents";
    const idField = buyerType === "company" ? "company_id" : "customer_id";

    const { data: documents, error } = await supabaseAdmin
      .from(tableName)
      .select("*")
      .eq(idField, buyerId)
      .eq("document_data->>group_key", saleId)
      .order("generated_at", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!documents || documents.length === 0) {
      return NextResponse.json({ error: "No documents found for this sale" }, { status: 404 });
    }

    return NextResponse.json({
      documents: documents.map((doc) => ({
        id: doc.id,
        document_type: doc.document_type,
        document_number: doc.document_number,
        generated_at: doc.generated_at,
        document_data: doc.document_data,
      })),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

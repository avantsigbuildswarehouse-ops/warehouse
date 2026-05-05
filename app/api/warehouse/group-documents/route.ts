import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const supabaseAdmin = getSupabaseAdmin();
const schema = "warehouse";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const groupKey = searchParams.get("group_key");
    const targetType = searchParams.get("target_type");
    const targetCode = searchParams.get("target_code");

    if (!groupKey || !targetType || !targetCode) {
      return NextResponse.json(
        { error: "Missing required parameters: group_key, target_type, target_code" },
        { status: 400 }
      );
    }

    const tableName = targetType === "dealer" ? "dealer_documents" : "showroom_documents";
    const codeField = targetType === "dealer" ? "dealer_code" : "showroom_code";

    const { data: documents, error } = await supabaseAdmin
      .schema(schema)
      .from(tableName)
      .select("*")
      .eq(codeField, targetCode)
      .eq("document_data->>group_key", groupKey)
      .order("generated_at", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!documents || documents.length === 0) {
      return NextResponse.json(
        { error: "No documents found for this batch" },
        { status: 404 }
      );
    }

    const documentList = documents.map(doc => ({
      id: doc.id,
      document_type: doc.document_type,
      document_number: doc.document_number,
      generated_at: doc.generated_at,
      document_data: doc.document_data,
    }));

    return NextResponse.json({ documents: documentList });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

// Remove the POST method since we're now doing client-side generation
// Keep only GET for fetching document metadata
import { NextResponse } from "next/server";

import { requireSalesRoute } from "@/lib/auth/require-sales-route";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const supabaseAdmin = getSupabaseAdmin();

export async function GET(req: Request) {
  const auth = await requireSalesRoute();
  if (auth.error) return auth.error;

  try {
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get("company_id");
    const documentType = searchParams.get("document_type");
    const documentNumber = searchParams.get("document_number");
    const documentId = searchParams.get("document_id");

    if (documentId) {
      const { data, error } = await supabaseAdmin
        .from("company_documents")
        .select("*")
        .eq("id", documentId)
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ document: data || null });
    }

    if (companyId && documentType && documentNumber) {
      const { data, error } = await supabaseAdmin
        .from("company_documents")
        .select("*")
        .eq("company_id", companyId)
        .eq("document_type", documentType)
        .eq("document_number", documentNumber)
        .single();

      if (error && error.code !== "PGRST116") {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ document: data || null });
    }

    if (companyId) {
      const { data, error } = await supabaseAdmin
        .from("company_documents")
        .select("*")
        .eq("company_id", companyId)
        .order("generated_at", { ascending: false });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ documents: data || [] });
    }

    return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(req: Request) {
  const auth = await requireSalesRoute();
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const { company_id, document_type, document_number, document_data } = body;

    if (!company_id || !document_type || !document_number || !document_data) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: company_id, document_type, document_number, document_data",
        },
        { status: 400 }
      );
    }

    const { data: existingDoc, error: checkError } = await supabaseAdmin
      .from("company_documents")
      .select("id")
      .eq("company_id", company_id)
      .eq("document_type", document_type)
      .eq("document_number", document_number)
      .single();

    if (checkError && checkError.code !== "PGRST116") {
      return NextResponse.json({ error: checkError.message }, { status: 500 });
    }

    if (existingDoc) {
      return NextResponse.json({
        message: "Document already exists",
        document_id: existingDoc.id,
        exists: true,
      });
    }

    const { data, error } = await supabaseAdmin
      .from("company_documents")
      .insert({
        company_id,
        document_type,
        document_number,
        document_data,
        generated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      document_id: data.id,
      exists: false,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

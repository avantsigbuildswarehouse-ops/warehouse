import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const supabaseAdmin = getSupabaseAdmin();
const schema = "warehouse";

// GET: Fetch existing document(s)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const dealerCode = searchParams.get("dealer_code");
    const documentType = searchParams.get("document_type");
    const documentNumber = searchParams.get("document_number");
    const documentId = searchParams.get("document_id");

    // Get single document by ID (for regeneration)
    if (documentId) {
      const { data, error } = await supabaseAdmin
        .schema(schema)
        .from("dealer_documents")
        .select("*")
        .eq("id", documentId)
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ document: data || null });
    }

    // If searching by document number
    if (dealerCode && documentType && documentNumber) {
      const { data, error } = await supabaseAdmin
        .schema(schema)
        .from("dealer_documents")
        .select("*")
        .eq("dealer_code", dealerCode)
        .eq("document_type", documentType)
        .eq("document_number", documentNumber)
        .single();

      if (error && error.code !== "PGRST116") {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ document: data || null });
    }

    // Get all documents for a dealer
    if (dealerCode) {
      const { data, error } = await supabaseAdmin
        .schema(schema)
        .from("dealer_documents")
        .select("*")
        .eq("dealer_code", dealerCode)
        .order("generated_at", { ascending: false });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ documents: data || [] });
    }

    return NextResponse.json(
      { error: "Missing required parameters" },
      { status: 400 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

// POST: Save new document
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { dealer_code, document_type, document_number, document_data } = body;

    if (!dealer_code || !document_type || !document_number || !document_data) {
      return NextResponse.json(
        { error: "Missing required fields: dealer_code, document_type, document_number, document_data" },
        { status: 400 }
      );
    }

    // Check if document already exists
    const { data: existingDoc, error: checkError } = await supabaseAdmin
      .schema(schema)
      .from("dealer_documents")
      .select("id")
      .eq("dealer_code", dealer_code)
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
        exists: true 
      });
    }

    // Insert new document
    const { data, error } = await supabaseAdmin
      .schema(schema)
      .from("dealer_documents")
      .insert({
        dealer_code,
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
      exists: false 
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
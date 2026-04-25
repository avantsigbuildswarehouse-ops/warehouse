import { NextResponse } from "next/server";
import { requireAdminRoute } from "@/lib/auth/require-admin-route";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { CompanyRegistrationData } from "@/lib/types/formTypes";

export async function POST(req: Request) {
  try {
    const authError = await requireAdminRoute();
    if (authError) return authError;

    const company: CompanyRegistrationData = await req.json();

    // Validate required fields
    if (!company.companyName || !company.companyEmail || !company.engineNumber || !company.chasisNumber) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Calculate totals
    const basePrice = parseFloat(company.basePrice) || 0;
    const vat = parseFloat(company.vat) || 0;
    const registrationFee = parseFloat(company.registrationFee) || 0;
    const discount = parseFloat(company.discount) || 0;
    const advancePayment = parseFloat(company.advancePayment) || 0;

    const total = basePrice + vat + registrationFee - discount;
    const balanceDue = total - advancePayment;

    // Insert company
    const { data: companyData, error: companyError } = await supabaseAdmin
      .from("Companies")
      .insert({
        company_name: company.companyName,
        BR_no: company.brNumber,
        VAT_no: company.vatRegistrationNumber,
        address: company.companyAddress,
        company_contact: company.companyContact,
        company_email: company.companyEmail
      })
      .select()
      .single();

    if (companyError) {
      return NextResponse.json(
        { error: companyError.message },
        { status: 500 }
      );
    }

    // Insert Vehicle
    const { data: vehicleData, error: vehicleError } = await supabaseAdmin
      .from("Vehicles")
      .insert({
        vehicleModel: company.vehicleModel,
        manuYear: company.manuYear,
        engineNumber: company.engineNumber,
        chassisNumber: company.chasisNumber,
        color: company.color
      })
      .select()
      .single();

    if (vehicleError) {
      return NextResponse.json(
        { error: vehicleError.message },
        { status: 500 }
      );
    }

    // Insert Quotation
    const { data: quotationData, error: quotationError } = await supabaseAdmin
      .from("Company_Quotation")
      .insert({
        company_id: companyData.id,
        engine_no: vehicleData.engineNumber,
        base_price: basePrice,
        VAT: vat,
        registration_fee: registrationFee,
        discount: discount,
        total_estimate: total
      })
      .select()
      .single();

    if (quotationError) {
      return NextResponse.json(
        { error: quotationError.message },
        { status: 500 }
      );
    }

    // Insert Invoice
    const { data: invoiceData, error: invoiceError } = await supabaseAdmin
      .from("Company_Invoice")
      .insert({
        company_id: companyData.id,
        engine_no: vehicleData.engineNumber,
        base_price: basePrice,
        VAT: vat,
        registration_fee: registrationFee,
        discount: discount,
        advance_payment: advancePayment,
        balance_due: balanceDue,
        payment_method: company.paymentMethod,
        total: total
      })
      .select()
      .single();

    if (invoiceError) {
      return NextResponse.json(
        { error: invoiceError.message },
        { status: 500 }
      );
    }

    // Insert Receipt if advance payment
    if (advancePayment > 0) {
      const { error: receiptError } = await supabaseAdmin
        .from("Company_Receipt")
        .insert({
          company_id: companyData.id,
          invoice_id: invoiceData.id,
          amount: advancePayment,
          payment_method: company.paymentMethod
        });

      if (receiptError) {
        return NextResponse.json(
          { error: receiptError.message },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 }
    );
  }
}
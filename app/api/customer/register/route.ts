import { NextResponse } from "next/server";
import { requireAdminRoute } from "@/lib/auth/require-admin-route";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { RegistrationData } from "@/lib/types/formTypes";

export async function POST(req: Request) {
  try {
    const authError = await requireAdminRoute();
    if (authError) return authError;

    const customer: RegistrationData = await req.json();

    // Validate required fields
    if (!customer.firstName || !customer.lastName || !customer.phoneNumber || !customer.engineNumber || !customer.chasisNumber) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Calculate totals
    const basePrice = parseFloat(customer.basePrice) || 0;
    const vat = parseFloat(customer.vat) || 0;
    const registrationFee = parseFloat(customer.registrationFee) || 0;
    const discount = parseFloat(customer.discount) || 0;
    const advancePayment = parseFloat(customer.advancePayment) || 0;

    const total = basePrice + vat + registrationFee - discount;
    const balanceDue = total - advancePayment;

    // Insert customer
    const { data: customerData, error: customerError } = await supabaseAdmin
      .from("Customers")
      .insert({
        first_name: customer.firstName,
        last_name: customer.lastName,
        address: customer.address,
        phone_number: customer.phoneNumber,
        nic: customer.nic
      })
      .select()
      .single();

    if (customerError) {
      return NextResponse.json(
        { error: customerError.message },
        { status: 500 }
      );
    }

    // Insert Vehicle
    const { data: vehicleData, error: vehicleError } = await supabaseAdmin
      .from("Vehicles")
      .insert({
        vehicleModel: customer.vehicleModel,
        manuYear: customer.manuYear,
        engineNumber: customer.engineNumber,
        chassisNumber: customer.chasisNumber,
        color: customer.color
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
      .from("Customer_Quotation")
      .insert({
        customer_id: customerData.id,
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
      .from("Customer_Invoice")
      .insert({
        customer_id: customerData.id,
        engine_no: vehicleData.engineNumber,
        base_price: basePrice,
        VAT: vat,
        registration_fee: registrationFee,
        discount: discount,
        advance_payment: advancePayment,
        balance_due: balanceDue,
        payment_method: customer.paymentMethod,
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
        .from("Customer_Receipt")
        .insert({
          customer_id: customerData.id,
          invoice_id: invoiceData.id,
          amount: advancePayment,
          payment_method: customer.paymentMethod
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
// hooks/insertData.ts
import { CompanyRegistrationData } from "../../../lib/types/formTypes"
import { createClient } from "../../../lib/supabase/client"
import { 
    CompanyResponse,
    VehicleResponse,
    CompanyQuoatationResponse,
    CompanyInvoiceResponse,
    CompanyReceiptResponse
 } from "../../../lib/types/companyResponse";

const insertData = async (company: CompanyRegistrationData) => {
    const supabase = createClient();

    try {
        // Calculate totals
        const basePrice = parseFloat(company.basePrice) || 0;
        const vat = parseFloat(company.vat) || 0;
        const registrationFee = parseFloat(company.registrationFee) || 0;
        const discount = parseFloat(company.discount) || 0;
        const advancePayment = parseFloat(company.advancePayment) || 0;
        
        const total = basePrice + vat + registrationFee - discount;
        const balanceDue = total - advancePayment;

        // Insert company
        const { data: companyData, error: companyError } = await supabase
            .from("Companies")
            .insert({
                company_name: company.companyName,
                BR_no: company.brNumber,
                VAT_no: company.vatRegistrationNumber,
                address: company.companyAddress,
                company_contact: company.companyContact,
                company_email: company.companyEmail
            } as any)
            .select()
            .single();

        if (companyError) {
            console.error("Error inserting company:", companyError);
            return companyError;
        }

        if (!companyData) {
            console.error("No company data returned");
            return new Error("No company data returned");
        }

        const typedcompanyData = companyData as unknown as CompanyResponse;

        // Insert Vehicle
        const { data: vehicleData, error: vehicleError } = await supabase
            .from("Vehicles")
            .insert({
                vehicleModel: company.vehicleModel,
                manuYear: company.manuYear,
                engineNumber: company.engineNumber,
                chassisNumber: company.chasisNumber,
                color: company.color
            } as any)
            .select()
            .single();

        if (vehicleError) {
            console.error("Error inserting vehicle:", vehicleError);
            return vehicleError;
        }

        if (!vehicleData) {
            console.error("No vehicle data returned");
            return new Error("No vehicle data returned");
        }

        const typedVehicleData = vehicleData as unknown as VehicleResponse;

        // Insert Quotation
        const { data: quotationData, error: quotationError } = await supabase
            .from("Company_Quotation")
            .insert({
                company_id: typedcompanyData.id,
                engine_no: typedVehicleData.engineNumber,
                base_price: basePrice,
                VAT: vat,
                registration_fee: registrationFee,
                discount: discount,
                total_estimate: total
            } as any)
            .select()
            .single();

        if (quotationError) {
            console.error("Error inserting quotation:", quotationError);
            return quotationError;
        }

        if (!quotationData) {
            console.error("No quotation data returned");
            return new Error("No quotation data returned");
        }

        const typedQuotationData = quotationData as unknown as CompanyQuoatationResponse;

        // Insert Invoice
        const { data: invoiceData, error: invoiceError } = await supabase
            .from("Company_Invoice")
            .insert({
                company_id: typedcompanyData.id,
                engine_no: typedVehicleData.engineNumber,
                chassis_no: typedVehicleData.chassisNumber,
                vehicle_model: company.vehicleModel,
                vehicle_color: company.color,
                calc_price: total,
                total_invoice: total,
                payment_method: company.paymentMethod,
                advance: advancePayment
            } as any)
            .select()
            .single();

        if (invoiceError) {
            console.error("Error inserting invoice:", invoiceError);
            return invoiceError;
        }

        if (!invoiceData) {
            console.error("No invoice data returned");
            return new Error("No invoice data returned");
        }

        const typedInvoiceData = invoiceData as unknown as CompanyInvoiceResponse;

        // Insert Receipt
        const { data: receiptData, error: receiptError } = await supabase
            .from("Company_Receipt")
            .insert({
                company_id: typedcompanyData.id,
                quotation_no: typedQuotationData.id,
                invoice_no: typedInvoiceData.id,
                amount_paid: advancePayment,
                balance_due: balanceDue,
            } as any)
            .select()
            .single();

        if (receiptError) {
            console.error("Error inserting receipt:", receiptError);
            return receiptError;
        }

        if (!receiptData) {
            console.error("No receipt data returned");
            return new Error("No receipt data returned");
        }

        const typedReceiptData = receiptData as unknown as CompanyReceiptResponse;

        console.log("All data inserted successfully!");
        return null;

    } catch (error) {
        console.error("Unexpected error:", error);
        return error;
    }
}

export default insertData;
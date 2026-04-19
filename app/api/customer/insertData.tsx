// hooks/insertData.ts
import { RegistrationData } from "../../../lib/types/formTypes";
import { createClient } from "../../../lib/supabase/client";
import { 
    CustomerResponse,
    VehicleResponse,
    CustomerQuoatationResponse,
    CustomerInvoiceResponse,
    CustomerReceiptResponse
 } from "../../../lib/types/customerResponse";

const insertData = async (customer: RegistrationData) => {
    const supabase = createClient();

    try {
        // Calculate totals
        const basePrice = parseFloat(customer.basePrice) || 0;
        const vat = parseFloat(customer.vat) || 0;
        const registrationFee = parseFloat(customer.registrationFee) || 0;
        const discount = parseFloat(customer.discount) || 0;
        const advancePayment = parseFloat(customer.advancePayment) || 0;
        
        const total = basePrice + vat + registrationFee - discount;
        const balanceDue = total - advancePayment;

        // Insert Customer
        const { data: customerData, error: customerError } = await supabase
            .from("Customers")
            .insert({
                firstName: customer.firstName,
                lastName: customer.lastName,
                address: customer.address,
                phoneNumber: customer.phoneNumber,
                nic_no: customer.nic
            } as any)
            .select()
            .single();

        if (customerError) {
            console.error("Error inserting customer:", customerError);
            return customerError;
        }

        if (!customerData) {
            console.error("No customer data returned");
            return new Error("No customer data returned");
        }

        const typedCustomerData = customerData as unknown as CustomerResponse;

        // Insert Vehicle
        const { data: vehicleData, error: vehicleError } = await supabase
            .from("Vehicles")
            .insert({
                vehicleModel: customer.vehicleModel,
                manuYear: customer.manuYear,
                engineNumber: customer.engineNumber,
                chassisNumber: customer.chasisNumber,
                color: customer.color
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
            .from("Customer_Quotation")
            .insert({
                customer_id: typedCustomerData.id,
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

        const typedQuotationData = quotationData as unknown as CustomerQuoatationResponse;

        // Insert Invoice
        const { data: invoiceData, error: invoiceError } = await supabase
            .from("Customer_Invoice")
            .insert({
                customer_id: typedCustomerData.id,
                engine_no: typedVehicleData.engineNumber,
                chassis_no: typedVehicleData.chassisNumber,
                vehicle_model: customer.vehicleModel,
                vehicle_color: customer.color,
                calc_price: total,
                total_invoice: total,
                payment_method: customer.paymentMethod,
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

        const typedInvoiceData = invoiceData as unknown as CustomerInvoiceResponse;

        // Insert Receipt
        const { data: receiptData, error: receiptError } = await supabase
            .from("Customer_Receipt")
            .insert({
                customer_id: typedCustomerData.id,
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

        const typedReceiptData = receiptData as unknown as CustomerReceiptResponse;

        console.log("All data inserted successfully!");
        return null;

    } catch (error) {
        console.error("Unexpected error:", error);
        return error;
    }
}

export default insertData;
export interface CompanyResponse {
    id: number;
    company_name: string;
    BR_no: string;
    VAT_no: string;
    address: string;
    company_contact: string;
    company_email: string;
  }
  
  export interface VehicleResponse {
    id: number;
    customer_id: number;
    vehicleModel: string;
    manuYear: string;
    engineNumber: string;
    chassisNumber: string;
    color: string;
  }
  
  export interface CompanyQuoatationResponse {
    id: number;
    company_id: number;
    engine_no: string;
    base_price: number;
    VAT: number;
    registration_fee: number;
    discount: number;
    total_estimate: number;
  }
  
  export interface CompanyInvoiceResponse {
    id: number;
    company_id: number;
    engine_no: string;
    chassis_no: string;
    vehicle_model: string;
    vehicle_color: string;
    calc_price: number;
    total_invoice: number;
    payment_method: string;
    advance: number;
  }
  
  export interface CompanyReceiptResponse {
    id: number;
    company_id: number;
    quotation_no: number;
    invoice_no: number;
    amount_paid: number;
    balance_due: number;
  }
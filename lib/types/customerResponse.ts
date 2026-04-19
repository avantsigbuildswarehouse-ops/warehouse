  export interface CustomerResponse {
    id: number;
    firstName: string;
    lastName: string;
    address: string;
    phoneNumber: string;
    nic_no: string;
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
  
  export interface CustomerQuoatationResponse {
    id: number;
    customer_id: number;
    engine_no: string;
    base_price: number;
    VAT: number;
    registration_fee: number;
    discount: number;
    total_estimate: number;
  }
  
  export interface CustomerInvoiceResponse {
    id: number;
    customer_id: number;
    engine_no: string;
    chassis_no: string;
    vehicle_model: string;
    vehicle_color: string;
    calc_price: number;
    total_invoice: number;
    payment_method: string;
    advance: number;
  }
  
  export interface CustomerReceiptResponse {
    id: number;
    customer_id: number;
    quotation_no: number;
    invoice_no: number;
    amount_paid: number;
    balance_due: number;
  }
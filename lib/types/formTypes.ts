export interface RegistrationData {
    firstName: string;
    lastName: string;
    address: string;
    phoneNumber: string;
    nic?: string;
    vehicleModel: string;
    manuYear: string;
    engineNumber: string;
    chasisNumber: string;
    color: string;
    basePrice: string;
    vat: string;
    registrationFee: string;
    discount: string;
    advancePayment: string;
    paymentMethod: string;
    balanceDue: string;
}

// types/forms.ts
export interface CompanyRegistrationData {
    companyName?: string;
    companyAddress?: string;
    vatRegistrationNumber?: string;
    brNumber?: string;
    companyContact?: string;
    companyEmail?: string;
    vehicleModel: string;
    manuYear: string;
    engineNumber: string;
    chasisNumber: string;
    color: string;
    basePrice: string;
    vat: string;
    registrationFee: string;
    discount: string;
    advancePayment: string;
    paymentMethod: string;
    balanceDue: string;
  }

  export interface DatabaseError {
    message: string;
    code: string;
  }
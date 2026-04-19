// hooks/useDataValidation.ts
import { useState } from 'react';
import { z } from 'zod';
import { RegistrationData } from '../../types/formTypes';
import { createClient } from '../../../lib/supabase/client';

// Define the validation schema
const registrationSchema = z.object({
  firstName: z.string()
    .min(1, "First name is required")
    .min(2, "First name must be at least 2 characters")
    .max(50, "First name must be less than 50 characters")
    .regex(/^[a-zA-Z\s]+$/, "First name can only contain letters and spaces"),
  
  lastName: z.string()
    .min(1, "Last name is required")
    .min(2, "Last name must be at least 2 characters")
    .max(50, "Last name must be less than 50 characters")
    .regex(/^[a-zA-Z\s]+$/, "Last name can only contain letters and spaces"),
  
  address: z.string()
    .min(1, "Address is required")
    .min(5, "Address must be at least 5 characters")
    .max(200, "Address must be less than 200 characters"),
  
  phoneNumber: z.string()
    .min(1, "Phone number is required")
    .regex(/^[0-9+\-\s()]+$/, "Invalid phone number format")
    .min(10, "Phone number must be at least 10 digits")
    .max(15, "Phone number must be less than 15 digits"),
  
  nic: z.string()
    .min(1, "NIC number is required")
    .min(10, "NIC number must be at least 10 characters")
    .max(12, "NIC number must be less than 12 characters")
    .regex(/^[0-9vVxX\-]+$/, "Invalid NIC format"),
  
  vehicleModel: z.string()
    .min(1, "Vehicle model is required")
    .min(2, "Vehicle model must be at least 2 characters")
    .max(100, "Vehicle model must be less than 100 characters"),
  
  manuYear: z.string()
    .min(1, "Manufactured year is required")
    .refine((year) => {
      const currentYear = new Date().getFullYear();
      const yearNum = parseInt(year);
      return yearNum >= 1900 && yearNum <= currentYear;
    }, `Year must be between 1900 and ${new Date().getFullYear()}`),
  
  engineNumber: z.string()
    .min(1, "Engine number is required")
    .min(3, "Engine number must be at least 3 characters")
    .max(50, "Engine number must be less than 50 characters")
    .regex(/^[A-Za-z0-9\-]+$/, "Engine number can only contain letters, numbers, and hyphens"),
  
  chasisNumber: z.string()
    .min(1, "Chassis number is required")
    .min(3, "Chassis number must be at least 3 characters")
    .max(50, "Chassis number must be less than 50 characters")
    .regex(/^[A-Za-z0-9\-]+$/, "Chassis number can only contain letters, numbers, and hyphens"),
  
  color: z.string()
    .min(1, "Vehicle color is required")
    .min(2, "Color must be at least 2 characters")
    .max(30, "Color must be less than 30 characters")
    .regex(/^[a-zA-Z\s]+$/, "Color can only contain letters and spaces"),
  
  paymentMethod: z.string()
    .min(1, "Payment method is required")
    .min(2, "Payment method must be at least 2 characters")
    .regex(/^[a-zA-Z\s]+$/, "Payment method can only contain letters and spaces"),  
  
  basePrice: z.string()
    .min(1, "Base price is required")
    .regex(/^\d+(\.\d{1,2})?$/, "Invalid price format")
    .refine((price) => parseFloat(price) > 0, "Base price must be greater than 0"),
  
  vat: z.string()
    .min(1, "VAT amount is required")
    .regex(/^\d+(\.\d{1,2})?$/, "Invalid VAT format")
    .refine((vat) => parseFloat(vat) >= 0, "VAT must be 0 or greater"),
  
  registrationFee: z.string()
    .min(1, "Registration fee is required")
    .regex(/^\d+(\.\d{1,2})?$/, "Invalid registration fee format")
    .refine((fee) => parseFloat(fee) >= 0, "Registration fee must be 0 or greater"),
  
  discount: z.string()
    .optional()
    .refine((discount) => {
      if (!discount) return true;
      return /^\d+(\.\d{1,2})?$/.test(discount);
    }, "Invalid discount format")
    .refine((discount) => {
      if (!discount) return true;
      return parseFloat(discount) >= 0;
    }, "Discount must be 0 or greater"),
  
  advancePayment: z.string()
    .min(1, "Advance payment is required")
    .regex(/^\d+(\.\d{1,2})?$/, "Invalid advance payment format")
    .refine((payment) => parseFloat(payment) >= 0, "Advance payment must be 0 or greater"),

  balanceDue: z.string()
    .regex(/^\d+(\.\d{1,2})?$/, "Invalid balance due format")
    .refine((payment) => parseFloat(payment) >= 0, "Balance due must be 0 or greater"),  
});

type ValidationErrors = {
  [K in keyof RegistrationData]?: string[];
};

interface ValidationResult {
  isValid: boolean;
  errors: ValidationErrors;
}

const useDataValidation = () => {
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isValidating, setIsValidating] = useState(false);

  // Function to check uniqueness in database
  const checkUniqueness = async (data: RegistrationData): Promise<ValidationErrors> => {
    const supabase = createClient();
    const uniquenessErrors: ValidationErrors = {};

    try {
      // Check phone number uniqueness
      const { data: phoneData, error: phoneError } = await supabase
        .from("Customers")
        .select("phoneNumber")
        .eq("phoneNumber", data.phoneNumber);

      if (phoneError) {
        console.error("Error checking phone number:", phoneError);
      } else if (phoneData && phoneData.length > 0) {
        uniquenessErrors.phoneNumber = ["This phone number is already registered"];
      }

      /* Check NIC uniqueness
      const { data: nicData, error: nicError } = await supabase
        .from("Customers")
        .select("nic_no")
        .eq("nic_no", data.nic);

      if (nicError) {
        console.error("Error checking NIC:", nicError);
      } else if (nicData && nicData.length > 0) {
        uniquenessErrors.nic = ["This NIC number is already registered"];
      }*/

      // Check engine number uniqueness
      const { data: engineData, error: engineError } = await supabase
        .from("Vehicles")
        .select("engineNumber")
        .eq("engineNumber", data.engineNumber);

      if (engineError) {
        console.error("Error checking engine number:", engineError);
      } else if (engineData && engineData.length > 0) {
        uniquenessErrors.engineNumber = ["This engine number is already registered"];
      }

      // Check chassis number uniqueness
      const { data: chassisData, error: chassisError } = await supabase
        .from("Vehicles")
        .select("chassisNumber")
        .eq("chassisNumber", data.chasisNumber);

      if (chassisError) {
        console.error("Error checking chassis number:", chassisError);
      } else if (chassisData && chassisData.length > 0) {
        uniquenessErrors.chasisNumber = ["This chassis number is already registered"];
      }

    } catch (error) {
      console.error("Error checking uniqueness:", error);
    }

    return uniquenessErrors;
  };

  // Validate a single field
  const validateField = (field: keyof RegistrationData, value: string): string[] => {
    try {
      const fieldSchema = z.object({
        [field]: registrationSchema.shape[field]
      });
      
      fieldSchema.parse({ [field]: value });
      return [];
    } catch (error) {
      if (error instanceof z.ZodError) {
        return error.issues.map((issue) => issue.message);
      }
      return ["Invalid value"];
    }
  };

  // Validate all fields
  const validateAll = async (data: RegistrationData): Promise<ValidationResult> => {
    setIsValidating(true);
    
    try {
      const validationErrors: ValidationErrors = {};

      // Validate with Zod schema
      try {
        registrationSchema.parse(data);
      } catch (error) {
        if (error instanceof z.ZodError) {
          error.issues.forEach((issue) => {
            const field = issue.path[0] as keyof RegistrationData;
            if (!validationErrors[field]) {
              validationErrors[field] = [];
            }
            validationErrors[field]!.push(issue.message);
          });
        }
      }

      // Validate payment logic
      if (data.basePrice && data.vat && data.registrationFee && data.advancePayment) {
        const basePrice = parseFloat(data.basePrice) || 0;
        const vat = parseFloat(data.vat) || 0;
        const registrationFee = parseFloat(data.registrationFee) || 0;
        const discount = parseFloat(data.discount) || 0;
        const advancePayment = parseFloat(data.advancePayment) || 0;
        
        const total = basePrice + vat + registrationFee - discount;
        
        if (advancePayment > total) {
          if (!validationErrors.advancePayment) {
            validationErrors.advancePayment = [];
          }
          validationErrors.advancePayment.push("Advance payment cannot exceed the total amount");
        }
      }

      // Check uniqueness only if basic validation passed
      let uniquenessErrors: ValidationErrors = {};
      if (Object.keys(validationErrors).length === 0) {
        uniquenessErrors = await checkUniqueness(data);
        
        // Merge uniqueness errors
        Object.keys(uniquenessErrors).forEach((field) => {
          const fieldKey = field as keyof RegistrationData;
          if (!validationErrors[fieldKey]) {
            validationErrors[fieldKey] = [];
          }
          validationErrors[fieldKey] = [
            ...(validationErrors[fieldKey] || []),
            ...(uniquenessErrors[fieldKey] || [])
          ];
        });
      }

      setErrors(validationErrors);
      return {
        isValid: Object.keys(validationErrors).length === 0,
        errors: validationErrors,
      };
    } finally {
      setIsValidating(false);
    }
  };

  const clearFieldError = (field: keyof RegistrationData) => {
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  };

  const clearAllErrors = () => {
    setErrors({});
  };

  return {
    errors,
    isValidating,
    validateField,
    validateAll,
    clearFieldError,
    clearAllErrors,
    schema: registrationSchema,
  };
};

export default useDataValidation;
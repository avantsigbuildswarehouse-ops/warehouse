// hooks/useCompanyDataValidation.ts
import { useState } from 'react';
import { z } from 'zod';
import { CompanyRegistrationData } from '../../types/formTypes';
import { createClient } from '../../../lib/supabase/client';

const companyRegistrationSchema = z.object({
    // Company Details
    companyName: z.string()
      .min(1, "Company name is required")
      .min(2, "Company name must be at least 2 characters")
      .max(100, "Company name must be less than 100 characters")
      .regex(/^[a-zA-Z0-9\s&.,'-]+$/, "Company name can only contain letters, numbers, spaces, and basic punctuation"),
    
    companyAddress: z.string()
      .min(1, "Company address is required")
      .min(5, "Address must be at least 5 characters")
      .max(200, "Address must be less than 200 characters"),
    
    vatRegistrationNumber: z.string()
      .min(1, "VAT registration number is required")
      .min(5, "VAT registration number must be at least 5 characters")
      .max(20, "VAT registration number must be less than 20 characters")
      .regex(/^[A-Za-z0-9\-]+$/, "VAT registration number can only contain letters, numbers, and hyphens"),
    
    brNumber: z.string()
      .min(1, "BR number is required")
      .min(3, "BR number must be at least 3 characters")
      .max(20, "BR number must be less than 20 characters")
      .regex(/^[A-Za-z0-9\-]+$/, "BR number can only contain letters, numbers, and hyphens"),
    
    companyContact: z.string()
      .min(1, "Company contact is required")
      .regex(/^[0-9+\-\s()]+$/, "Invalid phone number format")
      .min(10, "Phone number must be at least 10 digits")
      .max(15, "Phone number must be less than 15 digits"),
    
    companyEmail: z.string()
      .min(1, "Company email is required")
      .email("Invalid email format")
      .max(100, "Email must be less than 100 characters"),
    
    // Vehicle Details
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
    
    balanceDue: z.string()
      .optional(),
    
    // Payment Details
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
  });

type ValidationErrors = {
  [K in keyof CompanyRegistrationData]?: string[];
};

interface ValidationResult {
  isValid: boolean;
  errors: ValidationErrors;
}

const useCompanyDataValidation = () => {
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isValidating, setIsValidating] = useState(false);

  // Function to check uniqueness in database for company
  const checkUniqueness = async (data: CompanyRegistrationData): Promise<ValidationErrors> => {
    const supabase = createClient();
    const uniquenessErrors: ValidationErrors = {};

    try {
      // Check VAT registration number uniqueness - FIXED: Added undefined check and removed .single()
      if (data.vatRegistrationNumber) {
        const { data: vatData, error: vatError } = await supabase
          .from("Companies")
          .select("VAT_no")
          .eq("VAT_no", data.vatRegistrationNumber);

        if (vatError) {
          console.error("Error checking VAT number:", vatError);
        } else if (vatData && vatData.length > 0) {
          uniquenessErrors.vatRegistrationNumber = ["This VAT registration number is already registered"];
        }
      }

      // Check BR number uniqueness - FIXED: Added undefined check and removed .single()
      if (data.brNumber) {
        const { data: brData, error: brError } = await supabase
          .from("Companies")
          .select("BR_no")
          .eq("BR_no", data.brNumber);

        if (brError) {
          console.error("Error checking BR number:", brError);
        } else if (brData && brData.length > 0) {
          uniquenessErrors.brNumber = ["This BR number is already registered"];
        }
      }

      // Check company email uniqueness - FIXED: Added undefined check and removed .single()
      if (data.companyEmail) {
        const { data: emailData, error: emailError } = await supabase
          .from("Companies")
          .select("company_email")
          .eq("company_email", data.companyEmail);

        if (emailError) {
          console.error("Error checking company email:", emailError);
        } else if (emailData && emailData.length > 0) {
          uniquenessErrors.companyEmail = ["This company email is already registered"];
        }
      }

      // Check company contact uniqueness - FIXED: Added undefined check and removed .single()
      if (data.companyContact) {
        const { data: contactData, error: contactError } = await supabase
          .from("Companies")
          .select("company_contact")
          .eq("company_contact", data.companyContact);

        if (contactError) {
          console.error("Error checking company contact:", contactError);
        } else if (contactData && contactData.length > 0) {
          uniquenessErrors.companyContact = ["This company contact number is already registered"];
        }
      }

      // Check engine number uniqueness - FIXED: Added undefined check and removed .single()
      if (data.engineNumber) {
        const { data: engineData, error: engineError } = await supabase
          .from("Vehicles")
          .select("engineNumber")
          .eq("engineNumber", data.engineNumber);

        if (engineError) {
          console.error("Error checking engine number:", engineError);
        } else if (engineData && engineData.length > 0) {
          uniquenessErrors.engineNumber = ["This engine number is already registered"];
        }
      }

      // Check chassis number uniqueness - FIXED: Added undefined check and removed .single()
      if (data.chasisNumber) {
        const { data: chassisData, error: chassisError } = await supabase
          .from("Vehicles")
          .select("chassisNumber")
          .eq("chassisNumber", data.chasisNumber);

        if (chassisError) {
          console.error("Error checking chassis number:", chassisError);
        } else if (chassisData && chassisData.length > 0) {
          uniquenessErrors.chasisNumber = ["This chassis number is already registered"];
        }
      }

    } catch (error) {
      console.error("Error checking uniqueness:", error);
    }

    return uniquenessErrors;
  };

  // Validate a single field
  const validateField = (
    field: keyof CompanyRegistrationData,
    value: string
  ): string[] => {
    try {
      // Create a partial schema for the specific field
      const fieldSchema = z.object({
        [field]: companyRegistrationSchema.shape[field]
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
  const validateAll = async (data: CompanyRegistrationData): Promise<ValidationResult> => {
    setIsValidating(true);
    
    try {
      const validationErrors: ValidationErrors = {};

      // Validate with Zod schema
      try {
        companyRegistrationSchema.parse(data);
      } catch (error) {
        if (error instanceof z.ZodError) {
          error.issues.forEach((issue) => {
            const field = issue.path[0] as keyof CompanyRegistrationData;
            if (!validationErrors[field]) {
              validationErrors[field] = [];
            }
            validationErrors[field]!.push(issue.message);
          });
        }
      }

      // Validate payment logic - ensure advance payment doesn't exceed total
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
          const fieldKey = field as keyof CompanyRegistrationData;
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

  const clearFieldError = (field: keyof CompanyRegistrationData) => {
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
    schema: companyRegistrationSchema,
  };
};

export default useCompanyDataValidation;
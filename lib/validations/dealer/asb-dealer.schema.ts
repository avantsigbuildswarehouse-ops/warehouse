import { z } from "zod";

export const asbDealerSchema = z.object({
  business_name: z.string().min(2, "Business name is required"),
  owner_name: z.string().min(2, "Owner name is required").optional(),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  address: z.string().min(5, "Address is required"),
  is_active: z.boolean(),
});

export type ASBDealerFormValues = z.infer<typeof asbDealerSchema>;

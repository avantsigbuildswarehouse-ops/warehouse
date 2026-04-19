import { z } from "zod";

export const asbShowroomSchema = z.object({
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  address: z.string().min(5, "Address is required"),
  is_active: z.boolean(),
});

export type ASBShowroomFormValues = z.infer<typeof asbShowroomSchema>;

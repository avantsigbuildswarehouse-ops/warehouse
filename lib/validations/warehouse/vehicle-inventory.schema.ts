import { z } from "zod";

export const bikeSchema = z.object({
  engineNumber: z.string().min(1, "Engine required"),
  chassisNumber: z.string().min(1, "Chassis required"),
  color: z.string().min(1, "Color required"),
  yom: z.string().min(4, "Year invalid"),
  version: z.string().min(1, "Version required"),
});

export const vehicleInventorySchema = z.object({
  modelCode: z.string().min(1, "Model required"),
  bikes: z.array(bikeSchema).min(1, "At least one bike required"),
});

export type VehicleInventoryFormValues =
  z.infer<typeof vehicleInventorySchema>;
